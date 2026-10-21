import { BadRequestException } from '@nestjs/common';
import {
  emptyRefsView,
  objectRefIds,
  unpackChangeset,
  type Changeset,
  type MapEditResult,
  type MapOp,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  isEmptyEdit,
  runOps,
  runReplay,
  type EditLimits,
} from '../../maps/edit-run.js';
import {
  createdObjectIds,
  touchedRefsView,
} from '../../maps/objects/map-object-edit.js';
import {
  SCENE_NO_RESIZE,
  SCENE_NOTHING_TO_REDO,
  SCENE_NOTHING_TO_UNDO,
} from '../game-errors.js';
import type { SceneRow } from './scene-copy.js';
import { loadSceneEditRefs } from './scene-edit-refs.js';
import {
  commitSceneEdit,
  loadEventChanges,
  loadSceneStacks,
  type SceneJournalEntry,
} from './scene-journal.js';
import { sceneRefs } from './scene-refs.js';
import { sceneTarget } from './scene-storage.js';

// Правки сцены мастером (docs/plan/done/game.md, этап 6): блоки и объекты, как в редакторе
// карты, отмена и возврат. Каждая — внутри транзакции, которая уже взяла lockGame, и
// отвечает так же, как правка карты (MapEditResult). changed — правка записана в журнал
// и её надо разослать.

export interface SceneEditContext {
  tx: DbTransaction;
  gameId: string;
  masterId: string;
  scene: SceneRow;
  limits: EditLimits;
}

export interface SceneEditOutcome {
  result: MapEditResult;
  changed: boolean;
}

export async function editScene(
  ctx: SceneEditContext,
  ops: MapOp[],
): Promise<SceneEditOutcome> {
  const { tx, gameId, masterId, scene } = ctx;
  // Размер сцены меняют в карте и перезапускают сцену (решено с пользователем 2026-10-21).
  if (ops.some((op) => op.op === 'resize')) {
    throw new BadRequestException(SCENE_NO_RESIZE);
  }
  const run = await runOps(tx, sceneTarget(scene), ops, ctx.limits, (objects) =>
    loadSceneEditRefs(tx, gameId, masterId, objects, ops),
  );
  if (isEmptyEdit(run.applied)) {
    return {
      changed: false,
      result: {
        seq: scene.seq,
        changedCells: 0,
        conflicts: 0,
        paletteAdded: [],
        changes: { cells: [], paletteAdded: [] },
        createdObjectIds: [],
        refs: emptyRefsView(),
      },
    };
  }
  const committed = await commitSceneEdit(
    tx,
    gameId,
    masterId,
    scene,
    run,
    {
      kind: 'scene.edited',
      intent: { ops },
      libraryCopied: run.loaded?.libraryCopied ?? 0,
    },
    ctx.limits.maxChunks,
  );
  return {
    changed: true,
    result: {
      ...committed,
      createdObjectIds: createdObjectIds(run.applied),
      refs: run.loaded
        ? touchedRefsView(run.loaded.view, run.applied)
        : emptyRefsView(),
    },
  };
}

export async function undoScene(
  ctx: SceneEditContext,
): Promise<SceneEditOutcome> {
  const { undo } = await loadSceneStacks(ctx.tx, ctx.gameId, ctx.scene.id);
  if (undo === null) throw new BadRequestException(SCENE_NOTHING_TO_UNDO);
  const changeset = await loadChangeset(ctx, undo);
  return replay(ctx, changeset, (conflicts) => ({
    kind: 'scene.undone',
    intent: { seq: undo },
    conflicts,
  }));
}

// Возврат откатывает запись отмены: возвращается ровно то, что она сняла, а её
// конфликты так и остаются нетронутыми.
export async function redoScene(
  ctx: SceneEditContext,
): Promise<SceneEditOutcome> {
  const { redo } = await loadSceneStacks(ctx.tx, ctx.gameId, ctx.scene.id);
  if (redo === null) throw new BadRequestException(SCENE_NOTHING_TO_REDO);
  const changeset = await loadChangeset(ctx, redo.undoSeq);
  return replay(ctx, changeset, (conflicts) => ({
    kind: 'scene.redone',
    intent: { seq: redo.editSeq, undoSeq: redo.undoSeq },
    conflicts,
  }));
}

async function loadChangeset(
  ctx: SceneEditContext,
  seq: number,
): Promise<Changeset> {
  const changes = await loadEventChanges(ctx.tx, ctx.gameId, [seq]);
  return unpackChangeset(changes.get(seq) ?? { cells: [], paletteAdded: [] });
}

// Запись пишется и без изменений (всё в конфликтах): иначе стеки отмены, собранные по
// журналу, разошлись бы с тем, что видел мастер.
async function replay(
  ctx: SceneEditContext,
  changeset: Changeset,
  entry: (conflicts: number) => SceneJournalEntry,
): Promise<SceneEditOutcome> {
  const { tx, gameId, masterId, scene } = ctx;
  const run = await runReplay(tx, sceneTarget(scene), changeset);
  const committed = await commitSceneEdit(
    tx,
    gameId,
    masterId,
    scene,
    run,
    entry(run.conflicts),
    ctx.limits.maxChunks,
  );
  const touched = (run.applied.objects ?? []).flatMap((c) =>
    c.after ? [c.after] : [],
  );
  const { view } = await sceneRefs(tx, gameId, objectRefIds(touched));
  return {
    changed: true,
    result: {
      ...committed,
      conflicts: run.conflicts,
      createdObjectIds: [],
      refs: view,
    },
  };
}
