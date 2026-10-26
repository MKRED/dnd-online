import { itemEquip, type ItemLink } from 'shared';
import { toCatalogImage } from '../catalog/catalog-image.mapper.js';
import { toItemVariant } from './items.mapper.js';
import type { itemImages, items } from '../database/schema/index.js';

type ItemRow = typeof items.$inferSelect;
type ItemImageRow = typeof itemImages.$inferSelect;

// Предмет на существе (в инвентаре персонажа или снаряжении монстра) глазами смотрящего.
// Предмет видит его автор или любой — у опубликованного:
// - скрытому от смотрящего не отдаём ничего из карточки, даже id и вес (решено с
//   пользователем);
// - скрытый от владельца на существо не действует. Автор предмета на чужом листе видит
//   свою карточку (свои предметы видны всегда), но строка помечена inactive и в груз не
//   входит — вариант Б, решено с пользователем.
export function toItemLink(
  item: ItemRow | null,
  image: ItemImageRow | null,
  viewerId: string,
  ownerId: string,
): ItemLink {
  if (!item) return { item: null, missing: 'deleted' };
  const sees = (userId: string) => item.authorId === userId || item.isPublic;
  if (!sees(viewerId)) return { item: null, missing: 'hidden' };
  return {
    item: {
      id: item.id,
      name: item.name,
      category: item.category,
      rarity: item.rarity,
      weight: item.weight,
      isPublic: item.isPublic,
      image: toCatalogImage(image),
      equip: itemEquip(toItemVariant(item.category, item.details)),
    },
    missing: null,
    inactive: !sees(ownerId),
  };
}
