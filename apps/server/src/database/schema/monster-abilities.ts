import {
  index,
  integer,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { abilities } from './abilities.js';
import { monsters } from './monsters.js';

// Способности у монстра (docs/plan/done/monsters-npcs.md, этап 5): ссылки на каталог, как у
// персонажа (character-abilities.ts).
export const monsterAbilities = pgTable(
  'monster_abilities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    monsterId: uuid('monster_id')
      .notNull()
      .references(() => monsters.id, { onDelete: 'cascade' }),
    // null — автор удалил способность: строка-заглушка, её можно только убрать.
    abilityId: uuid('ability_id').references(() => abilities.id, {
      onDelete: 'set null',
    }),
    // «N в день» у заклинания; null — неограниченно. У остального всегда null.
    perDay: integer('per_day'),
    // Порядок внутри группы — по времени добавления.
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('monster_abilities_once').on(table.monsterId, table.abilityId),
    index('monster_abilities_ability_idx').on(table.abilityId),
  ],
);
