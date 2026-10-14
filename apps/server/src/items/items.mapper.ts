import type { Item } from 'shared';
import type { items } from '../database/schema/index.js';
import type { ItemDto } from './dto/item.dto.js';

type ItemRow = typeof items.$inferSelect;
type NewItemRow = typeof items.$inferInsert;

// Стоимость в базе — две колонки (check-ограничение держит их в паре), в API — объект.
export function toItem(row: ItemRow, authorNickname: string): Item {
  return {
    id: row.id,
    authorId: row.authorId,
    authorNickname,
    isPublic: row.isPublic,
    name: row.name,
    category: row.category,
    rarity: row.rarity,
    details: row.details,
    weight: row.weight,
    cost:
      row.costAmount !== null && row.costCoin !== null
        ? { amount: row.costAmount, coin: row.costCoin }
        : null,
    description: row.description,
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
