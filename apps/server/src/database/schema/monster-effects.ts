import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { effects } from './effects.js';
import { monsters } from './monsters.js';

// Постоянные эффекты шаблона монстра (docs/plan/monsters-npcs.md, этап 6): ссылки на
// эффекты каталога, как эффекты на персонаже (character-effects.ts).
export const monsterEffects = pgTable(
  'monster_effects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    monsterId: uuid('monster_id')
      .notNull()
      .references(() => monsters.id, { onDelete: 'cascade' }),
    // null — автор удалил эффект: плашка-заглушка, её можно только снять.
    effectId: uuid('effect_id').references(() => effects.id, {
      onDelete: 'set null',
    }),
    // Порядок плашек — по времени наложения.
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Одно и то же заклинание по книге не складывается — один эффект один раз.
    unique('monster_effects_once').on(table.monsterId, table.effectId),
    index('monster_effects_effect_idx').on(table.effectId),
  ],
);
