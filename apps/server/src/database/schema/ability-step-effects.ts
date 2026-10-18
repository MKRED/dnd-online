import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { abilities } from './abilities.js';
import { effects } from './effects.js';

// Эффекты в исходах шагов способности (docs/plan/abilities.md, этап 8): строка — эффект
// каталога, который шаг накладывает при попадании или провале (hit) либо при промахе или
// успехе (miss). Отдельная таблица, а не id в extra.steps, — как состав набора
// (item_pack_entries): удалили способность — уходят её строки; удалили эффект — он
// пропадает из всех способностей, своих и чужих.
export const abilityStepEffects = pgTable(
  'ability_step_effects',
  {
    abilityId: uuid('ability_id')
      .notNull()
      .references(() => abilities.id, { onDelete: 'cascade' }),
    // Номер шага с нуля; шаги переписываются целиком при каждом сохранении — строки тоже.
    step: integer('step').notNull(),
    outcome: varchar('outcome', { length: 4 }).notNull(),
    effectId: uuid('effect_id')
      .notNull()
      .references(() => effects.id, { onDelete: 'cascade' }),
    // Порядок эффектов в исходе, как его задал автор.
    position: integer('position').notNull(),
  },
  (table) => [
    // Один эффект — один раз на исход.
    primaryKey({
      columns: [table.abilityId, table.step, table.outcome, table.effectId],
    }),
    // «Какие способности накладывают эффект» — для удаления и скрытия.
    index('ability_step_effects_effect_idx').on(table.effectId),
    check(
      'ability_step_effects_outcome',
      sql`${table.outcome} in ('hit', 'miss')`,
    ),
    // Шаги с 0 по ABILITY_STEPS_MAX − 1 (3 шага): поднимут предел шагов — нужна миграция
    // этой проверки.
    check('ability_step_effects_step', sql`${table.step} between 0 and 2`),
  ],
);
