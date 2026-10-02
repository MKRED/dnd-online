import { BadRequestException } from '@nestjs/common';
import { aliasedTable, and, desc, eq, gt, max } from 'drizzle-orm';
import {
  cellLocation,
  type Changeset,
  type ChunkStore,
  type MapEditResult,
  type MapOp,
  type Palette,
} from 'shared';
import type { DbTransaction } from '../database/database.service.js';
import { mapOps, maps, type MapJournalKind } from '../database/schema/index.js';
import { packChangeset } from './changeset-codec.js';
import { countChunks, saveChunks } from './map-storage.js';

type MapOpRow = typeof mapOps.$inferSelect;

export function chunkKeysOfChangeset(changeset: Changeset): Set<string> {
  return new Set(changeset.cells.map(({ at }) => cellLocation(at).key));
}

export interface JournalEntry {
  kind: MapJournalKind;
  targetSeq?: number;
  ops?: MapOp[];
}

export interface CommitInput {
  mapId: string;
  authorId: string;
  // seq карты до этой записи (строка карты заблокирована FOR UPDATE).
  currentSeq: number;
  palette: Palette;
  store: ChunkStore;
  // Чанки, которые были в БД до применения: по ним считаются созданные и удалённые.
  loadedKeys: Set<string>;
  applied: Changeset;
  entry: JournalEntry;
  maxChunks: number;
}

// Сохраняет результат правки: изменённые чанки, запись журнала с новым seq, палитру.
export async function commitEdit(
  tx: DbTransaction,
  input: CommitInput,
): Promise<MapEditResult> {
  const { mapId, applied, store, loadedKeys } = input;
  const dirtyKeys = chunkKeysOfChangeset(applied);
  let created = 0;
  let deleted = 0;
  for (const key of dirtyKeys) {
    const exists = store.get(key) !== undefined;
    if (exists && !loadedKeys.has(key)) created++;
    if (!exists && loadedKeys.has(key)) deleted++;
  }
  // Лимит проверяется, только когда карта растёт: правка, уменьшающая уже
  // превысившую лимит карту, должна проходить.
  if (created > deleted) {
    const total = (await countChunks(tx, mapId)) + created - deleted;
    if (total > input.maxChunks) {
      throw new BadRequestException(
        `Карта превысит лимит в ${input.maxChunks} чанков (16×16×16 клеток)`,
      );
    }
  }
  await saveChunks(tx, mapId, store, dirtyKeys);

  const seq = input.currentSeq + 1;
  await tx.insert(mapOps).values({
    mapId,
    seq,
    kind: input.entry.kind,
    targetSeq: input.entry.targetSeq,
    ops: input.entry.ops,
    changeset: packChangeset(applied),
    authorId: input.authorId,
  });
  await tx
    .update(maps)
    .set({ seq, palette: input.palette })
    .where(eq(maps.id, mapId));

  return {
    seq,
    changedCells: applied.cells.length,
    conflicts: 0,
    paletteAdded: applied.paletteAdded.map((p) => p.name),
  };
}

// Последняя действующая (не отменённая) операция — её снимает undo. undefined —
// отменять нечего; тип указан явно, иначе `[row]` из пустой выборки выводится как MapOpRow.
export async function findUndoTarget(
  tx: DbTransaction,
  mapId: string,
): Promise<MapOpRow | undefined> {
  const [row] = await tx
    .select()
    .from(mapOps)
    .where(
      and(
        eq(mapOps.mapId, mapId),
        eq(mapOps.kind, 'op'),
        eq(mapOps.undone, false),
      ),
    )
    .orderBy(desc(mapOps.seq))
    .limit(1);
  return row;
}

// Запись undo, которую вернёт redo: самая поздняя отмена после последней новой
// операции, чья цель всё ещё отменена. Новая операция так «очищает» стек redo:
// отмены до неё в выборку не попадают.
export async function findRedoSource(tx: DbTransaction, mapId: string) {
  const [last] = await tx
    .select({ seq: max(mapOps.seq) })
    .from(mapOps)
    .where(and(eq(mapOps.mapId, mapId), eq(mapOps.kind, 'op')));
  const target = aliasedTable(mapOps, 'target');
  const [row] = await tx
    .select({ undo: mapOps })
    .from(mapOps)
    .innerJoin(
      target,
      and(eq(target.mapId, mapOps.mapId), eq(target.seq, mapOps.targetSeq)),
    )
    .where(
      and(
        eq(mapOps.mapId, mapId),
        eq(mapOps.kind, 'undo'),
        gt(mapOps.seq, last?.seq ?? 0),
        eq(target.undone, true),
      ),
    )
    .orderBy(desc(mapOps.seq))
    .limit(1);
  return row?.undo;
}

export async function setUndone(
  tx: DbTransaction,
  mapId: string,
  seq: number,
  undone: boolean,
) {
  await tx
    .update(mapOps)
    .set({ undone })
    .where(and(eq(mapOps.mapId, mapId), eq(mapOps.seq, seq)));
}
