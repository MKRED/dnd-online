import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  GAME_LIBRARY_KINDS,
  type GameLibraryKind,
  type GameLibraryRef,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import {
  gameLibrary,
  gameLibraryImageFiles,
} from '../../database/schema/index.js';
import { linkedRefs, type LibraryLinks } from './library-links.js';
import { loadSourceLinks } from './library-source-links.js';
import {
  loadSources,
  SOURCE_IMAGES,
  type LibrarySource,
} from './library-sources.js';

// Копирование записей справочников в библиотеку игры (docs/plan/game.md, этап 4). Всё —
// внутри транзакции, которая уже взяла lockGame: две правки одной игры не скопируют
// запись дважды.

// Копирует записи вместе со всем, на что они ссылаются, глазами viewerId: скрытое от него
// и удалённое не копируется (в игре это заглушка). Уже скопированное не трогает.
// Возвращает, сколько записей скопировано.
export async function copyToLibrary(
  tx: DbTransaction,
  gameId: string,
  viewerId: string,
  roots: readonly GameLibraryRef[],
): Promise<number> {
  const seen = new Set<string>();
  let pending = [...roots];
  let copied = 0;
  // Волнами: монстр → его способности → их эффекты. Повтор и цикл (набор в наборе)
  // отсекает seen.
  while (pending.length > 0) {
    const next: GameLibraryRef[] = [];
    for (const kind of GAME_LIBRARY_KINDS) {
      const ids = [
        ...new Set(
          pending
            .filter((ref) => ref.kind === kind)
            .map((ref) => ref.sourceId)
            .filter((id) => !seen.has(`${kind}:${id}`)),
        ),
      ];
      for (const id of ids) seen.add(`${kind}:${id}`);
      const fresh = await notInLibrary(tx, gameId, kind, ids);
      const sources = await loadSources(tx, kind, fresh, viewerId);
      if (sources.length === 0) continue;
      const links = await loadSourceLinks(
        tx,
        kind,
        sources.map((source) => source.sourceId),
      );
      await tx.insert(gameLibrary).values(
        sources.map((source) => ({
          ...libraryValues(source, links.get(source.sourceId), 1),
          gameId,
          kind,
          sourceId: source.sourceId,
        })),
      );
      await copyImageFiles(tx, gameId, kind, sources);
      copied += sources.length;
      for (const stored of links.values())
        next.push(...linkedRefs(kind, stored));
    }
    pending = next;
  }
  return copied;
}

// Переписывает копию из справочника глазами viewerId и докопирует новые связи. null —
// записи в справочнике нет или она скрыта от viewerId: копия остаётся как была.
export async function refreshLibraryEntry(
  tx: DbTransaction,
  gameId: string,
  viewerId: string,
  ref: GameLibraryRef,
  imageVersion: number,
): Promise<{ name: string; copied: number } | null> {
  const [source] = await loadSources(tx, ref.kind, [ref.sourceId], viewerId);
  if (!source) return null;
  const links = await loadSourceLinks(tx, ref.kind, [ref.sourceId]);
  const where = and(
    eq(gameLibrary.gameId, gameId),
    eq(gameLibrary.kind, ref.kind),
    eq(gameLibrary.sourceId, ref.sourceId),
  );
  await tx
    .update(gameLibrary)
    .set({
      ...libraryValues(source, links.get(ref.sourceId), imageVersion + 1),
      refreshedAt: new Date(),
    })
    .where(where);
  await tx
    .delete(gameLibraryImageFiles)
    .where(
      and(
        eq(gameLibraryImageFiles.gameId, gameId),
        eq(gameLibraryImageFiles.kind, ref.kind),
        eq(gameLibraryImageFiles.sourceId, ref.sourceId),
      ),
    );
  await copyImageFiles(tx, gameId, ref.kind, [source]);
  const stored = links.get(ref.sourceId);
  const copied = stored
    ? await copyToLibrary(tx, gameId, viewerId, linkedRefs(ref.kind, stored))
    : 0;
  return { name: source.name, copied };
}

function libraryValues(
  source: LibrarySource,
  links: LibraryLinks[GameLibraryKind] | undefined,
  imageVersion: number,
) {
  return {
    name: source.name,
    authorNickname: source.authorNickname,
    record: source.record,
    links: { ...links },
    image: source.image ? { ...source.image, version: imageVersion } : null,
    sourceUpdatedAt: source.updatedAt,
  };
}

async function notInLibrary(
  tx: DbTransaction,
  gameId: string,
  kind: GameLibraryKind,
  ids: readonly string[],
): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await tx
    .select({ sourceId: gameLibrary.sourceId })
    .from(gameLibrary)
    .where(
      and(
        eq(gameLibrary.gameId, gameId),
        eq(gameLibrary.kind, kind),
        inArray(gameLibrary.sourceId, [...ids]),
      ),
    );
  const present = new Set(rows.map((row) => row.sourceId));
  return ids.filter((id) => !present.has(id));
}

// Байты картинок копируются внутри базы, не проходя через сервер: они бывают по
// нескольку мегабайт.
async function copyImageFiles(
  tx: DbTransaction,
  gameId: string,
  kind: GameLibraryKind,
  sources: readonly LibrarySource[],
) {
  const ids = sources
    .filter((source) => source.image)
    .map((source) => source.sourceId);
  if (ids.length === 0) return;
  const { files } = SOURCE_IMAGES[kind];
  await tx.insert(gameLibraryImageFiles).select(
    tx
      .select({
        gameId: sql<string>`${gameId}::uuid`.as('game_id'),
        kind: sql<GameLibraryKind>`${kind}`.as('kind'),
        sourceId: files.ownerId,
        variant: files.variant,
        data: files.data,
      })
      .from(files)
      .where(inArray(files.ownerId, ids)),
  );
}
