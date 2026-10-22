import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DbTransaction } from '../../database/database.service.js';
import type { Db } from '../../catalog/catalog-access.js';
import {
  characterImageFiles,
  characterImages,
  characterModels,
  characters,
  gameLibraryImageFiles,
  gameLibraryModelFiles,
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
      model: {
        format: characterModels.format,
        color: characterModels.color,
        fit: characterModels.fit,
        updatedAt: characterModels.updatedAt,
      },
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
    .leftJoin(characterModels, eq(characterModels.characterId, characters.id))
    .where(
      and(inArray(characters.id, [...ids]), eq(characters.userId, viewerId)),
    );
  return rows.map(({ character, nickname, image, model }) => {
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
      model: model
        ? { format: model.format, color: model.color, fit: model.fit }
        : null,
      updatedAt: latest(character.updatedAt, model?.updatedAt),
    };
  });
}

// Когда лист правили последний раз — для сверки копии. Правка предметов, способностей
// и эффектов листа updated_at не двигает, как и у монстров; правка 3D-модели — двигает:
// у неё своё время, и копия берёт позднее из двух.
export async function npcStamps(
  db: Db,
  ids: readonly string[],
  viewerId: string,
): Promise<Map<string, Date>> {
  const rows = await db
    .select({
      id: characters.id,
      updatedAt: characters.updatedAt,
      modelUpdatedAt: characterModels.updatedAt,
    })
    .from(characters)
    .leftJoin(characterModels, eq(characterModels.characterId, characters.id))
    .where(
      and(inArray(characters.id, [...ids]), eq(characters.userId, viewerId)),
    );
  return new Map(
    rows.map((row) => [row.id, latest(row.updatedAt, row.modelUpdatedAt)]),
  );
}

function latest(sheet: Date, model: Date | null | undefined): Date {
  return model && model > sheet ? model : sheet;
}

// Байты 3D-моделей — тоже внутри базы, не проходя через сервер.
export async function copyNpcModelFiles(
  tx: DbTransaction,
  gameId: string,
  ids: readonly string[],
) {
  if (ids.length === 0) return;
  await tx.insert(gameLibraryModelFiles).select(
    tx
      .select({
        gameId: sql<string>`${gameId}::uuid`.as('game_id'),
        kind: sql<'npc'>`'npc'`.as('kind'),
        sourceId: characterModels.characterId,
        data: characterModels.data,
      })
      .from(characterModels)
      .where(inArray(characterModels.characterId, [...ids])),
  );
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
