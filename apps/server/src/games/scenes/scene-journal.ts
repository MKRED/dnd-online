import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import {
  packChangeset,
  type GameEventKind,
  type MapOp,
  type PackedChangeset,
  type SceneEditResult,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import type { DbTransaction } from '../../database/database.service.js';
import { gameEvents, gameScenes } from '../../database/schema/index.js';
import { saveEdit, type EditRun } from '../../maps/edit-run.js';
import type { CommitResult } from '../../maps/map-journal.js';
import { appendGameEvent } from '../game-journal.js';
import type { SceneRow } from './scene-copy.js';
import { sceneStorage } from './scene-storage.js';

// Журнал правок сцены (docs/plan/done/game.md, этап 6) — записи журнала игры, а не map_ops:
// отдельного журнала у сцены нет. Changeset лежит в колонке changes записи, в прямом
// виде — и у правки, и у отмены, и у возврата: рассылка применяет их одинаково.

const EDIT_KINDS: GameEventKind[] = [
  'scene.edited',
  'scene.undone',
  'scene.redone',
];

export type SceneJournalEntry =
  | { kind: 'scene.edited'; intent: { ops: MapOp[] }; libraryCopied: number }
  | { kind: 'scene.undone'; intent: { seq: number }; conflicts: number }
  | {
      kind: 'scene.redone';
      intent: { seq: number; undoSeq: number };
      conflicts: number;
    };

const asMaster = { kind: 'master' } as const;

// Сохраняет правку сцены, пишет запись журнала и двигает номер правки сцены.
export async function commitSceneEdit(
  tx: DbTransaction,
  gameId: string,
  masterId: string,
  scene: SceneRow,
  run: EditRun,
  entry: SceneJournalEntry,
  maxChunks: number,
): Promise<CommitResult> {
  const { applied, state } = run;
  await saveEdit(tx, sceneStorage(scene.id), run, maxChunks);
  const sceneSeq = scene.seq + 1;
  const changes = packChangeset(applied);
  const base: SceneEditResult = {
    scene: { id: scene.id, name: scene.name },
    sceneSeq,
    cells: applied.cells.length,
    objects: applied.objects?.length ?? 0,
  };
  const common = {
    actorId: masterId,
    as: asMaster,
    sceneId: scene.id,
    changes,
  };
  if (entry.kind === 'scene.edited') {
    await appendGameEvent(tx, gameId, {
      ...common,
      kind: entry.kind,
      intent: entry.intent,
      result: { ...base, libraryCopied: entry.libraryCopied },
    });
  } else if (entry.kind === 'scene.undone') {
    await appendGameEvent(tx, gameId, {
      ...common,
      kind: entry.kind,
      intent: entry.intent,
      result: { ...base, conflicts: entry.conflicts },
    });
  } else {
    await appendGameEvent(tx, gameId, {
      ...common,
      kind: entry.kind,
      intent: entry.intent,
      result: { ...base, conflicts: entry.conflicts },
    });
  }
  await tx
    .update(gameScenes)
    .set({
      seq: sceneSeq,
      palette: state.palette,
      ...(state.objects && { nextObjectId: state.objects.nextId }),
    })
    .where(eq(gameScenes.id, scene.id));
  return {
    seq: sceneSeq,
    changedCells: applied.cells.length,
    conflicts: 0,
    paletteAdded: applied.paletteAdded.map((p) => p.name),
    changes,
  };
}

// Что снимет «Отменить» и что вернёт «Вернуть». Стек правок мастера в сцене собирается
// по журналу: правка кладёт себя в стек отмены и очищает стек возврата, отмена переносит
// верх стека отмены в стек возврата, возврат — обратно. Перезапуск даёт новую сцену —
// с пустыми стеками.
export interface SceneUndoStacks {
  // Запись scene.edited, которую снимет отмена.
  undo: number | null;
  // Отмена, которую откатит возврат, и правка, которую она сняла.
  redo: { undoSeq: number; editSeq: number } | null;
}

export async function loadSceneStacks(
  tx: DbTransaction,
  gameId: string,
  sceneId: string,
): Promise<SceneUndoStacks> {
  const rows = await tx
    .select({
      seq: gameEvents.seq,
      kind: gameEvents.kind,
      // Номер правки, на которую ссылается отмена или возврат (intent.seq).
      target: sql<number | null>`(${gameEvents.intent} ->> 'seq')::int`,
    })
    .from(gameEvents)
    .where(
      and(
        eq(gameEvents.gameId, gameId),
        eq(gameEvents.sceneId, sceneId),
        inArray(gameEvents.kind, EDIT_KINDS),
      ),
    )
    .orderBy(asc(gameEvents.seq));
  const done: number[] = [];
  const undone: { undoSeq: number; editSeq: number }[] = [];
  for (const row of rows) {
    if (row.kind === 'scene.edited') {
      done.push(row.seq);
      undone.length = 0;
    } else if (row.kind === 'scene.undone') {
      done.pop();
      undone.push({ undoSeq: row.seq, editSeq: row.target ?? 0 });
    } else {
      undone.pop();
      done.push(row.target ?? 0);
    }
  }
  return { undo: done.at(-1) ?? null, redo: undone.at(-1) ?? null };
}

// Changeset записей журнала по номерам. Записи правок сцены всегда пишутся с changes
// (commitSceneEdit); без него — пустая правка.
export async function loadEventChanges(
  db: Db,
  gameId: string,
  seqs: number[],
): Promise<Map<number, PackedChangeset>> {
  if (seqs.length === 0) return new Map();
  const rows = await db
    .select({ seq: gameEvents.seq, changes: gameEvents.changes })
    .from(gameEvents)
    .where(and(eq(gameEvents.gameId, gameId), inArray(gameEvents.seq, seqs)));
  return new Map(
    rows.map(({ seq, changes }) => [
      seq,
      changes ?? { cells: [], paletteAdded: [] },
    ]),
  );
}
