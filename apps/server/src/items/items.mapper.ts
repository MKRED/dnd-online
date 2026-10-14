import type { Item, ItemCategory, ItemDetails, ItemVariant } from 'shared';
import type { itemImages, items } from '../database/schema/index.js';
import type { ItemDto } from './dto/item.dto.js';

type ItemRow = typeof items.$inferSelect;
type NewItemRow = typeof items.$inferInsert;

// Поля категории из базы. Еда, сохранённая до появления насыщения (2026-10-14), лежит с
// пустыми details — читаем её как насыщение 0, а не правим строки миграцией.
export function toItemVariant(
  category: ItemCategory,
  details: ItemDetails,
): ItemVariant {
  if (category === 'food') {
    const { satiety } = details as { satiety?: unknown };
    return {
      category,
      details: { satiety: typeof satiety === 'number' ? satiety : 0 },
    };
  }
  return { category, details: {} };
}

// Стоимость в базе — две колонки (check-ограничение держит их в паре), в API — объект.
export function toItem(
  row: ItemRow,
  authorNickname: string,
  image: typeof itemImages.$inferSelect | null = null,
): Item {
  return {
    id: row.id,
    authorId: row.authorId,
    authorNickname,
    isPublic: row.isPublic,
    name: row.name,
    ...toItemVariant(row.category, row.details),
    rarity: row.rarity,
    weight: row.weight,
    cost:
      row.costAmount !== null && row.costCoin !== null
        ? { amount: row.costAmount, coin: row.costCoin }
        : null,
    description: row.description,
    image: image
      ? {
          version: image.version,
          width: image.width,
          height: image.height,
          thumbCrop: image.thumbCrop,
        }
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// Поля предмета из DTO — общая часть создания и полного редактирования (PUT).
export function toItemValues(dto: ItemDto): Omit<NewItemRow, 'authorId'> {
  return {
    name: dto.name,
    category: dto.category,
    rarity: dto.rarity,
    details: dto.details,
    weight: dto.weight,
    // null, а не undefined: при редактировании снятая цена должна стереться.
    costAmount: dto.cost?.amount ?? null,
    costCoin: dto.cost?.coin ?? null,
    description: dto.description ?? '',
    isPublic: dto.isPublic,
  };
}
