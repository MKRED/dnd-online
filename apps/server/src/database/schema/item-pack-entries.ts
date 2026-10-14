import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  uuid,
} from 'drizzle-orm/pg-core';
import { items } from './items.js';

// Состав набора снаряжения (docs/plan/item-packs.md): строка — предмет каталога с
// количеством. Отдельная таблица, а не details, — решено с пользователем: внешние ключи
// держат целостность. Удалили набор — уходят его строки; удалили предмет — он пропадает
// из всех наборов, своих и чужих.
export const itemPackEntries = pgTable(
  'item_pack_entries',
  {
    packId: uuid('pack_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => items.id, { onDelete: 'cascade' }),
    // В единице самого предмета: масло ×7 фляг, рационы ×10.
    quantity: integer('quantity').notNull(),
    // Порядок строк, как его задал автор набора.
    position: integer('position').notNull(),
  },
  (table) => [
    // Один предмет — одна строка набора.
    primaryKey({ columns: [table.packId, table.itemId] }),
    // «В каких наборах лежит предмет» — для удаления и скрытия.
    index('item_pack_entries_item_idx').on(table.itemId),
    check(
      'item_pack_entries_quantity',
      sql`${table.quantity} between 1 and 1000`,
    ),
  ],
);
