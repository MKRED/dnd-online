import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { items } from './items.js';
import { monsters } from './monsters.js';

// Снаряжение монстра (docs/plan/monsters-npcs.md, этап 6): ссылки на предметы каталога
// с количеством, как инвентарь персонажа, но одним списком — без мест хранения.
export const monsterItems = pgTable(
  'monster_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    monsterId: uuid('monster_id')
      .notNull()
      .references(() => monsters.id, { onDelete: 'cascade' }),
    // null — автор удалил предмет: строка-заглушка, её можно только убрать.
    itemId: uuid('item_id').references(() => items.id, {
      onDelete: 'set null',
    }),
    quantity: integer('quantity').notNull(),
    // Порядок строк — по времени добавления.
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Один предмет — одна строка. Строки удалённых (null) не мешают друг другу.
    unique('monster_items_once').on(table.monsterId, table.itemId),
    index('monster_items_item_idx').on(table.itemId),
    check('monster_items_quantity', sql`${table.quantity} between 1 and 9999`),
  ],
);
