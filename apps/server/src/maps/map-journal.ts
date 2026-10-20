import { aliasedTable, and, desc, eq, gt, max } from 'drizzle-orm';
import { packChangeset, type MapEditResult, type MapOp } from 'shared';
import type { DbTransaction } from '../database/database.service.js';
import { mapOps, maps, type MapJournalKind } from '../database/schema/index.js';
import { saveEdit, type EditRun } from './edit-run.js';
import { mapStorage } from './storage/index.js';

type MapOpRow = typeof mapOps.$inferSelect;

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
  // Правка в памяти; размер в ней меняет только resize и его отмена.
  run: EditRun;
  entry: JournalEntry;
  maxChunks: number;
}

// Что знает о правке журнал; номера новых объектов и справочник ссылок добавляет сервис.
export type CommitResult = Omit<MapEditResult, 'createdObjectIds' | 'refs'>;

// Сохраняет результат правки: изменённые чанки и объекты, запись журнала с новым seq, палитру.
export async function commitEdit(
  tx: DbTransaction,
  input: CommitInput,
): Promise<CommitResult> {
  const { mapId, run } = input;
  const { applied, state } = run;
  await saveEdit(tx, mapStorage(mapId), run, input.maxChunks);

  const seq = input.currentSeq + 1;
  const changes = packChangeset(applied);
  await tx.insert(mapOps).values({
    mapId,
    seq,
    kind: input.entry.kind,
    targetSeq: input.entry.targetSeq,
    ops: input.entry.ops,
    changeset: changes,
    authorId: input.authorId,
  });
  await tx
    .update(maps)
    .set({
      seq,
      palette: state.palette,
      width: state.size.width,
      depth: state.size.depth,
      ...(state.objects && { nextObjectId: state.objects.nextId }),
    })
    .where(eq(maps.id, mapId));

  return {
    seq,
    changedCells: applied.cells.length,
    conflicts: 0,
    paletteAdded: applied.paletteAdded.map((p) => p.name),
    changes,
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
