import {
  boolean,
  index,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { abilities } from './abilities.js';
import { characters } from './characters.js';

// Способности у персонажа (docs/plan/done/character-abilities.md): строка — ссылка на
// способность каталога, как эффект на персонаже. Откуда способность (класс, вид, черта),
// пока не храним: это придёт с ростом от уровня класса.
export const characterAbilities = pgTable(
  'character_abilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    // null — автор удалил способность: строка «Способность удалена автором», её можно
    // только убрать.
    abilityId: uuid('ability_id').references(() => abilities.id, {
      onDelete: 'set null',
    }),
    // Подготовлено ли заклинание; у остального не используется.
    prepared: boolean('prepared').notNull().default(false),
    // Порядок внутри группы — по времени добавления.
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Одна способность у персонажа — один раз. Строки удалённых (null) не мешают друг
    // другу: null в unique различны.
    unique('character_abilities_once').on(table.characterId, table.abilityId),
    // «У кого способность» — для будущих предупреждений автору при удалении и скрытии.
    index('character_abilities_ability_idx').on(table.abilityId),
  ],
);
