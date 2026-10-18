import { and, desc, eq, sql } from 'drizzle-orm';
import type { Bookmark } from 'shared';
import { ABILITY_ACCESS } from '../abilities/abilities.config.js';
import { entryVisibleTo, type Db } from '../catalog/catalog-access.js';
import { characterVisibleTo } from '../characters/character-visibility.js';
import {
  abilities,
  abilityImages,
  bookmarks,
  characterImages,
  characters,
  effectImages,
  effects,
  itemImages,
  items,
  users,
} from '../database/schema/index.js';
import { EFFECT_ACCESS } from '../effects/effects.config.js';
import { ITEM_ACCESS } from '../items/item-access.js';
import { toBookmark } from './bookmarks.mapper.js';

// Все закладки игрока одним запросом, новые сверху. Проверка доступа к цели — в условии
// join: скрытая от игрока цель не находится, и закладка приходит плашкой без названия.
// У строки заполнена ровно одна ссылка, поэтому coalesce берёт поля найденной цели.
export async function loadBookmarks(
  db: Db,
  userId: string,
): Promise<Bookmark[]> {
  const authorId = sql<string | null>`coalesce(${characters.userId}, ${
    items.authorId
  }, ${abilities.authorId}, ${effects.authorId})`;
  const name = sql<string | null>`coalesce(${characters.name}, ${
    items.name
  }, ${abilities.name}, ${effects.name})`;
  const rows = await db
    .select({
      characterId: bookmarks.characterId,
      itemId: bookmarks.itemId,
      abilityId: bookmarks.abilityId,
      effectId: bookmarks.effectId,
      createdAt: bookmarks.createdAt,
      name,
      authorId,
      authorNickname: users.nickname,
      mainImage: {
        id: characterImages.id,
        thumbVersion: characterImages.thumbVersion,
      },
      itemImage: itemImages,
      abilityImage: abilityImages,
      effectImage: effectImages,
    })
    .from(bookmarks)
    .leftJoin(
      characters,
      and(eq(characters.id, bookmarks.characterId), characterVisibleTo(userId)),
    )
    .leftJoin(
      items,
      and(eq(items.id, bookmarks.itemId), entryVisibleTo(ITEM_ACCESS, userId)),
    )
    .leftJoin(
      abilities,
      and(
        eq(abilities.id, bookmarks.abilityId),
        entryVisibleTo(ABILITY_ACCESS, userId),
      ),
    )
    .leftJoin(
      effects,
      and(
        eq(effects.id, bookmarks.effectId),
        entryVisibleTo(EFFECT_ACCESS, userId),
      ),
    )
    .leftJoin(users, eq(users.id, authorId))
    .leftJoin(
      characterImages,
      and(
        eq(characterImages.characterId, characters.id),
        eq(characterImages.isMain, true),
      ),
    )
    .leftJoin(itemImages, eq(itemImages.ownerId, items.id))
    .leftJoin(abilityImages, eq(abilityImages.ownerId, abilities.id))
    .leftJoin(effectImages, eq(effectImages.ownerId, effects.id))
    .where(eq(bookmarks.userId, userId))
    .orderBy(desc(bookmarks.createdAt), desc(bookmarks.id));
  return rows.map(toBookmark);
}
