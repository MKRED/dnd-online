import type { Bookmark, CharacterMainImage } from 'shared';
import {
  toCatalogImage,
  type CatalogImageRow,
} from '../catalog/catalog-image.mapper.js';

// Строка списка закладок: ссылки самой закладки и то, что join нашёл о цели. authorId —
// null, если цель скрыта от хозяина закладки (join с проверкой доступа ничего не нашёл).
export interface BookmarkRow {
  characterId: string | null;
  itemId: string | null;
  abilityId: string | null;
  effectId: string | null;
  monsterId: string | null;
  createdAt: Date;
  name: string | null;
  authorId: string | null;
  authorNickname: string | null;
  mainImage: CharacterMainImage | null;
  itemImage: CatalogImageRow | null;
  abilityImage: CatalogImageRow | null;
  effectImage: CatalogImageRow | null;
  monsterImage: CatalogImageRow | null;
}

export function toBookmark(row: BookmarkRow): Bookmark {
  const createdAt = row.createdAt.toISOString();
  const seen =
    row.authorId !== null && row.name !== null
      ? {
          name: row.name,
          authorId: row.authorId,
          authorNickname: row.authorNickname ?? '',
        }
      : null;
  if (row.characterId) {
    return {
      kind: 'character',
      targetId: row.characterId,
      createdAt,
      target: seen && { ...seen, mainImage: row.mainImage },
    };
  }
  const catalog = (
    kind: Exclude<Bookmark['kind'], 'character'>,
    targetId: string,
    image: CatalogImageRow | null,
  ): Bookmark => ({
    kind,
    targetId,
    createdAt,
    target: seen && { ...seen, image: toCatalogImage(image) },
  });
  if (row.itemId) return catalog('item', row.itemId, row.itemImage);
  if (row.abilityId) return catalog('ability', row.abilityId, row.abilityImage);
  if (row.effectId) return catalog('effect', row.effectId, row.effectImage);
  if (row.monsterId) {
    return catalog('monster', row.monsterId, row.monsterImage);
  }
  // Проверка bookmarks_one_target в базе не даёт строке остаться без цели.
  throw new Error('Bookmark row has no target');
}
