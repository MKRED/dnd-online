import { and, asc, eq, or, type SQL } from 'drizzle-orm';
import {
  GAME_LIBRARY_KINDS,
  type CatalogImageVariant,
  type CharacterModelFormat,
  type GameLibraryEntry,
  type GameLibraryItem,
  type GameLibraryRef,
  type GameLibrarySource,
} from 'shared';
import type { Db } from '../../catalog/catalog-access.js';
import {
  gameLibrary,
  gameLibraryImageFiles,
  gameLibraryModelFiles,
} from '../../database/schema/index.js';
import { linkedRefs, readLinks } from './library-links.js';
import {
  libraryKey,
  toLibraryRecord,
  type LibraryRow,
} from './library-record.js';
import { sourceStamps } from './library-sources.js';

// Чтение библиотеки игры. Сверка со справочником — глазами смотрящего (мастера): что
// скрыто от него, то для него «нет в справочнике».

export async function listLibrary(
  db: Db,
  gameId: string,
  viewerId: string,
): Promise<GameLibraryItem[]> {
  const rows = await db
    .select()
    .from(gameLibrary)
    .where(eq(gameLibrary.gameId, gameId))
    .orderBy(asc(gameLibrary.name), asc(gameLibrary.kind));
  const states = await sourceStates(db, rows, viewerId);
  return rows.map((row) => toLibraryItem(row, states));
}

export async function findLibraryRow(
  db: Db,
  gameId: string,
  ref: GameLibraryRef,
): Promise<LibraryRow | undefined> {
  const [row] = await db
    .select()
    .from(gameLibrary)
    .where(refWhere(gameId, ref))
    .limit(1);
  return row;
}

export async function readLibraryEntry(
  db: Db,
  row: LibraryRow,
  viewerId: string,
): Promise<GameLibraryEntry> {
  const refs = linkedRefs(row.kind, readLinks(row.kind, row.links));
  const linkedRows =
    refs.length === 0
      ? []
      : await db
          .select()
          .from(gameLibrary)
          .where(or(...refs.map((ref) => refWhere(row.gameId, ref))));
  const linked = new Map(
    linkedRows.map((found) => [libraryKey(found.kind, found.sourceId), found]),
  );
  const states = await sourceStates(db, [row], viewerId);
  // Вид записи и её поля связаны через row.kind; TypeScript не видит этого через switch.
  return {
    ...toLibraryItem(row, states),
    record: toLibraryRecord(row, linked),
  } as GameLibraryEntry;
}

export async function readLibraryImage(
  db: Db,
  gameId: string,
  ref: GameLibraryRef,
  variant: CatalogImageVariant,
): Promise<Buffer | undefined> {
  const [row] = await db
    .select({ data: gameLibraryImageFiles.data })
    .from(gameLibraryImageFiles)
    .where(
      and(
        eq(gameLibraryImageFiles.gameId, gameId),
        eq(gameLibraryImageFiles.kind, ref.kind),
        eq(gameLibraryImageFiles.sourceId, ref.sourceId),
        eq(gameLibraryImageFiles.variant, variant),
      ),
    )
    .limit(1);
  return row?.data;
}

// Байты копии 3D-модели НПС и её формат (docs/plan/done/character-models.md, этап 4).
export async function readLibraryModel(
  db: Db,
  gameId: string,
  ref: GameLibraryRef,
): Promise<{ data: Buffer; format: CharacterModelFormat } | undefined> {
  const [row] = await db
    .select({ data: gameLibraryModelFiles.data, model: gameLibrary.model })
    .from(gameLibraryModelFiles)
    .innerJoin(
      gameLibrary,
      and(
        eq(gameLibrary.gameId, gameLibraryModelFiles.gameId),
        eq(gameLibrary.kind, gameLibraryModelFiles.kind),
        eq(gameLibrary.sourceId, gameLibraryModelFiles.sourceId),
      ),
    )
    .where(
      and(
        eq(gameLibraryModelFiles.gameId, gameId),
        eq(gameLibraryModelFiles.kind, ref.kind),
        eq(gameLibraryModelFiles.sourceId, ref.sourceId),
      ),
    )
    .limit(1);
  // У НПС формат — в метаданных копии, у снимка модели монстра — у её файла.
  const model = row?.model;
  const format =
    model && ('format' in model ? model.format : model.mesh?.format);
  return format ? { data: row.data, format } : undefined;
}

function refWhere(gameId: string, ref: GameLibraryRef): SQL | undefined {
  return and(
    eq(gameLibrary.gameId, gameId),
    eq(gameLibrary.kind, ref.kind),
    eq(gameLibrary.sourceId, ref.sourceId),
  );
}

function toLibraryItem(
  row: LibraryRow,
  states: ReadonlyMap<string, GameLibrarySource>,
): GameLibraryItem {
  return {
    kind: row.kind,
    sourceId: row.sourceId,
    name: row.name,
    category: row.kind === 'npc' ? 'npc' : String(row.record.category),
    image: row.image,
    copiedAt: row.copiedAt.toISOString(),
    refreshedAt: row.refreshedAt?.toISOString() ?? null,
    source: states.get(libraryKey(row.kind, row.sourceId)) ?? 'missing',
  };
}

async function sourceStates(
  db: Db,
  rows: readonly LibraryRow[],
  viewerId: string,
): Promise<Map<string, GameLibrarySource>> {
  const states = new Map<string, GameLibrarySource>();
  for (const kind of GAME_LIBRARY_KINDS) {
    const ofKind = rows.filter((row) => row.kind === kind);
    const stamps = await sourceStamps(
      db,
      kind,
      ofKind.map((row) => row.sourceId),
      viewerId,
    );
    for (const row of ofKind) {
      const stamp = stamps.get(row.sourceId);
      states.set(
        libraryKey(kind, row.sourceId),
        !stamp
          ? 'missing'
          : stamp.getTime() > row.sourceUpdatedAt.getTime()
            ? 'changed'
            : 'same',
      );
    }
  }
  return states;
}
