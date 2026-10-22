import { BadRequestException } from '@nestjs/common';
import {
  applyChangeset,
  type BlockCatalog,
  cellLocation,
  chunkKeysInBox,
  editMap,
  isBlockOp,
  isObjectOp,
  opRegion,
  type Changeset,
  type MapBoundsLimits,
  type MapObjects,
  type MapOp,
  type MapSize,
  type MemoryChunkStore,
  type ObjectRefs,
  type Palette,
} from 'shared';
import type { DbTransaction } from '../database/database.service.js';
import type { EditStorage } from './storage/index.js';

// Правка в памяти, общая для карты в редакторе и сцены игры (docs/plan/done/game.md, этап 6):
// загрузить задетые чанки и объекты из хранилища, применить пачку или откатить запись
// журнала, сохранить. Журнал у карты и сцены свой (map-journal.ts, scenes/scene-journal.ts).

// Что правится: хранилище и то, что лежит в строке карты или сцены.
export interface EditTarget {
  storage: EditStorage;
  palette: Palette;
  // Каталог владельца: какие свои блоки можно поставить (docs/plan/blocks.md, этап 3).
  blocks: BlockCatalog;
  size: MapSize;
  nextObjectId: number;
}

export interface EditState {
  store: MemoryChunkStore;
  palette: Palette;
  blocks: BlockCatalog;
  size: MapSize;
  // Объекты, если правка их загружала: из них берётся счётчик номеров. Не из
  // changeset — «поставил и убрал» в одной пачке двигает счётчик без объекта в changeset.
  objects?: MapObjects;
}

export interface EditRun {
  state: EditState;
  // Чанки, которые были в БД до применения: по ним считаются созданные и удалённые.
  loadedKeys: Set<string>;
  applied: Changeset;
}

export interface EditLimits extends MapBoundsLimits {
  maxObjects: number;
  maxChunks: number;
}

export function chunkKeysOfChangeset(changeset: Changeset): Set<string> {
  return new Set(changeset.cells.map(({ at }) => cellLocation(at).key));
}

// Пачка ничего не изменила — записи в журнал не нужно, номер правки не двигается.
export function isEmptyEdit(applied: Changeset): boolean {
  return applied.cells.length === 0 && !applied.size && !applied.objects;
}

// Применяет пачку. Ссылки объектов (loadRefs) читаются, только если пачка трогает
// объекты: операциями объектов или resize. При ошибке бросает — транзакция откатится.
export async function runOps<R extends { refs: ObjectRefs }>(
  tx: DbTransaction,
  target: EditTarget,
  ops: MapOp[],
  limits: EditLimits,
  loadRefs: (objects: MapObjects) => Promise<R>,
): Promise<EditRun & { loaded: R | null }> {
  // resize сдвигает и срезает все блоки — ему нужны все чанки, а операциям объектов
  // чанки не нужны вовсе.
  const resizes = ops.some((op) => op.op === 'resize');
  const keys = resizes
    ? 'all'
    : [
        ...new Set(
          ops.filter(isBlockOp).flatMap((op) => chunkKeysInBox(opRegion(op))),
        ),
      ];
  const store = await target.storage.loadChunks(tx, keys);
  const loadedKeys = new Set(store.keys());
  let objects: MapObjects | undefined;
  let loaded: R | null = null;
  if (resizes || ops.some(isObjectOp)) {
    objects = await target.storage.loadObjects(tx, target.nextObjectId);
    loaded = await loadRefs(objects);
  }
  const state: EditState = {
    store,
    palette: [...target.palette],
    blocks: target.blocks,
    size: { ...target.size },
    objects,
  };
  const applied = editMap(state, ops, limits, {
    refs: loaded?.refs,
    maxObjects: limits.maxObjects,
  });
  return { state, loadedKeys, applied, loaded };
}

// Откатывает запись журнала: undo — правку, redo — отмену. conflicts — клетки и
// объекты, которые не тронуты: их уже изменили после этой записи.
export async function runReplay(
  tx: DbTransaction,
  target: EditTarget,
  changeset: Changeset,
): Promise<EditRun & { conflicts: number }> {
  const store = await target.storage.loadChunks(tx, [
    ...chunkKeysOfChangeset(changeset),
  ]);
  const loadedKeys = new Set(store.keys());
  const objects = changeset.objects
    ? await target.storage.loadObjects(tx, target.nextObjectId)
    : undefined;
  const state: EditState = {
    store,
    palette: [...target.palette],
    blocks: target.blocks,
    size: { ...target.size },
    objects,
  };
  const { conflicts, objectConflicts, applied } = applyChangeset(
    state,
    changeset,
    'backward',
  );
  return {
    state,
    loadedKeys,
    applied,
    conflicts: conflicts.length + objectConflicts.length,
  };
}

// Пишет изменённые чанки и объекты. Лимит чанков проверяется, только когда карта
// растёт: правка, уменьшающая уже превысившую лимит карту, должна проходить.
export async function saveEdit(
  tx: DbTransaction,
  storage: EditStorage,
  run: EditRun,
  maxChunks: number,
): Promise<void> {
  const { applied, state, loadedKeys } = run;
  const dirtyKeys = chunkKeysOfChangeset(applied);
  let created = 0;
  let deleted = 0;
  for (const key of dirtyKeys) {
    const exists = state.store.get(key) !== undefined;
    if (exists && !loadedKeys.has(key)) created++;
    if (!exists && loadedKeys.has(key)) deleted++;
  }
  if (created > deleted) {
    const total = (await storage.countChunks(tx)) + created - deleted;
    if (total > maxChunks) {
      throw new BadRequestException(
        `Карта превысит лимит в ${maxChunks} чанков (16×16×16 клеток)`,
      );
    }
  }
  await storage.saveChunks(tx, state.store, dirtyKeys);
  if (applied.objects) await storage.saveObjects(tx, applied.objects);
}
