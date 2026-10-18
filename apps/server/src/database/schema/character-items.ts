import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { InventoryLocation } from 'shared';
import { characters } from './characters.js';
import { items } from './items.js';

// Инвентарь персонажа (docs/plan/done/character-inventory.md): строка — ссылка на предмет
// каталога с количеством, а не копия. Отдельная таблица, а не jsonb: внешние ключи
// держат «удалён автором» и «у кого лежит предмет».
export const characterItems = pgTable(
  'character_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    // null — автор удалил предмет: строка остаётся «Предмет удалён автором», её можно убрать.
    itemId: uuid('item_id').references(() => items.id, {
      onDelete: 'set null',
    }),
    // INVENTORY_LOCATIONS из shared; список проверяют DTO и check.
    location: varchar('location', { length: 20 })
      .$type<InventoryLocation>()
      .notNull(),
    quantity: integer('quantity').notNull(),
    // Порядок строк — по времени добавления; перенос и сложение его не меняют.
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Один предмет в одном месте — одна строка; повтор прибавляется к количеству.
    // Строки удалённых предметов (null) не мешают друг другу: null в unique различны.
    unique('character_items_place').on(
      table.characterId,
      table.itemId,
      table.location,
    ),
    // «У кого лежит предмет» — для предупреждений автору при удалении и скрытии.
    index('character_items_item_idx').on(table.itemId),
    check(
      'character_items_location',
      sql`${table.location} in ('carried', 'stash')`,
    ),
    check(
      'character_items_quantity',
      sql`${table.quantity} between 1 and 9999`,
    ),
  ],
);
