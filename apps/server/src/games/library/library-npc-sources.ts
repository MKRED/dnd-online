import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.service.js';
import type { Db } from '../../catalog/catalog-access.js';
import {
  characterImageFiles,
  characterImages,
  characters,
  gameLibraryImageFiles,
  users,
} from '../../database/schema/index.js';
import type { LibrarySource } from './library-sources.js';

// НПС как источник копии (docs/plan/done/game.md, этап 5): персонаж, а не запись справочника.
// Видит его только владелец — мастер, чья карта; чужой НПС на карте остаётся заглушкой.

const NOT_SHEET = [
  'id',
  'userId',
  'linkAccess',
  'createdAt',
  'updatedAt',
] as const;

export async function loadNpcSources(
  db: Db,
  ids: readonly string[],
  viewerId: string,
): Promise<LibrarySource[]> {
  const rows = await db
    .select({
      character: characters,
      nickname: users.nickname,
      image: characterImages,
    })
    .from(characters)
    .innerJoin(users, eq(users.id, characters.userId))
    .leftJoin(
      characterImages,
      and(
        eq(characterImages.characterId, characters.id),
        eq(characterImages.isMain, true),
      ),
    )
    .where(
      and(inArray(characters.id, [...ids]), eq(characters.userId, viewerId)),
    );
  return rows.map(({ character, nickname, image }) => {
    // Лист без id, владельца, доступа по ссылке и времени — как у копий справочников.
    const sheet: Record<string, unknown> = { ...character };
    for (const key of NOT_SHEET) delete sheet[key];
    return {
      sourceId: character.id,
      name: character.name,
      authorNickname: nickname,
      record: sheet,
      // Основная картинка галереи; версию копии задаёт библиотека.
      image: image
        ? {
            version: 1,
            width: image.width,
            height: image.height,
            thumbCrop: image.thumbCrop,
          }
        : null,
      updatedAt: character.updatedAt,
    };
  });
}

// Когда лист правили последний раз — для сверки копии. Правка предметов, способностей
// и эффектов листа updated_at не двигает, как и у монстров.
export async function npcStamps(
  db: Db,
  ids: readonly string[],
  viewerId: string,
): Promise<Map<string, Date>> {
  const rows = await db
    .select({ id: characters.id, updatedAt: characters.updatedAt })
    .from(characters)
    .where(
      and(inArray(characters.id, [...ids]), eq(characters.userId, viewerId)),
    );
  return new Map(rows.map((row) => [row.id, row.updatedAt]));
}

// Полная картинка и миниатюра основной картинки — внутри базы. Средний вариант галереи
// (preview) игре не нужен.
export async function copyNpcImageFiles(
  tx: DbTransaction,
  gameId: string,
  ids: readonly string[],
) {
  if (ids.length === 0) return;
  await tx.insert(gameLibraryImageFiles).select(
    tx
      .select({
        gameId: sql<string>`${gameId}::uuid`.as('game_id'),
        kind: sql<'npc'>`'npc'`.as('kind'),
        sourceId: characterImages.characterId,
        variant: characterImageFiles.variant,
        data: characterImageFiles.data,
      })
      .from(characterImageFiles)
      .innerJoin(
        characterImages,
        eq(characterImages.id, characterImageFiles.imageId),
      )
      .where(
        and(
          inArray(characterImages.characterId, [...ids]),
          eq(characterImages.isMain, true),
          inArray(characterImageFiles.variant, ['full', 'thumb']),
        ),
      ),
  );
}
