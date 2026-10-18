import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { Coin, ItemCategory, ItemRarity } from 'shared';
import { users } from './users.js';

// Предмет общего каталога (docs/plan/done/items.md). Общие поля — колонки, поля категории —
// jsonb details: новая категория не требует ни таблицы, ни миграции.
export const items = pgTable(
  'items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    // Скрытый предмет видит только автор; опубликованный — все в каталоге.
    isPublic: boolean('is_public').notNull().default(false),
    name: varchar('name', { length: 100 }).notNull(),
    // Ключ из ITEM_CATEGORIES (shared); список проверяет DTO.
    category: varchar('category', { length: 30 })
      .$type<ItemCategory>()
      .notNull(),
    // Ключ из ITEM_RARITIES; 'none' — немагический предмет, у него редкости нет.
    rarity: varchar('rarity', { length: 20 })
      .$type<ItemRarity>()
      .notNull()
      .default('none'),
    // Поля категории; маппер читает их по category. У набора здесь пустой объект: его
    // состав — в item_pack_entries.
    details: jsonb('details')
      .notNull()
      .$type<Record<string, unknown>>()
      .default({}),
    // Фунты до сотых: в книге бывает 1/4 фнт. mode number — без него drizzle отдаёт строку.
    weight: numeric('weight', { precision: 8, scale: 2, mode: 'number' })
      .notNull()
      .default(0),
    // Стоимость как в книге: число и монета. Обе null — у предмета нет цены.
    costAmount: integer('cost_amount'),
    costCoin: varchar('cost_coin', { length: 2 }).$type<Coin>(),
    description: text('description').notNull().default(''),
    // Источники предмета: строки текста или ссылок (shared/catalogSources.ts).
    sources: jsonb('sources').notNull().$type<string[]>().default([]),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index('items_author_idx').on(table.authorId),
    // Каталог читает только опубликованные — частичный индекс по ним.
    index('items_public_idx')
      .on(table.updatedAt)
      .where(sql`${table.isPublic}`),
    check(
      'items_cost_pair',
      sql`(${table.costAmount} is null) = (${table.costCoin} is null)`,
    ),
  ],
);
