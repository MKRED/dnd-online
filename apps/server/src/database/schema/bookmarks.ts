import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { abilities } from './abilities.js';
import { characters } from './characters.js';
import { effects } from './effects.js';
import { items } from './items.js';
import { users } from './users.js';

// Закладки (docs/plan/bookmarks.md): строка — отметка игрока на персонаже или записи
// справочника. Четыре колонки ссылок, а не «вид + id»: удалили цель — каскад сам убирает
// её закладки, кода уборки не нужно.
export const bookmarks = pgTable(
  'bookmarks',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id').references(() => characters.id, {
      onDelete: 'cascade',
    }),
    itemId: uuid('item_id').references(() => items.id, { onDelete: 'cascade' }),
    abilityId: uuid('ability_id').references(() => abilities.id, {
      onDelete: 'cascade',
    }),
    effectId: uuid('effect_id').references(() => effects.id, {
      onDelete: 'cascade',
    }),
    // Порядок на странице — новые сверху.
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check(
      'bookmarks_one_target',
      sql`num_nonnulls(${table.characterId}, ${table.itemId}, ${table.abilityId}, ${table.effectId}) = 1`,
    ),
    // Одна цель — одна закладка игрока. null в unique различны, так что строки других
    // видов не мешают друг другу. Первая колонка — хозяин: по ней же читается список.
    unique('bookmarks_character_once').on(table.userId, table.characterId),
    unique('bookmarks_item_once').on(table.userId, table.itemId),
    unique('bookmarks_ability_once').on(table.userId, table.abilityId),
    unique('bookmarks_effect_once').on(table.userId, table.effectId),
    // Каскад при удалении цели ищет строки по её колонке.
    index('bookmarks_character_idx').on(table.characterId),
    index('bookmarks_item_idx').on(table.itemId),
    index('bookmarks_ability_idx').on(table.abilityId),
    index('bookmarks_effect_idx').on(table.effectId),
  ],
);
