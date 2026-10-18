import { index, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { characters } from './characters.js';
import { effects } from './effects.js';

// Эффекты на персонаже (docs/plan/done/character-effects.md): строка — ссылка на эффект
// каталога, как строка инвентаря. Оставшееся время не хранится: ходов в приложении ещё
// нет, эффект снимает игрок.
export const characterEffects = pgTable(
  'character_effects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    // null — автор удалил эффект: плашка «Эффект удалён автором», её можно только снять.
    effectId: uuid('effect_id').references(() => effects.id, {
      onDelete: 'set null',
    }),
    // Порядок плашек — по времени наложения.
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Один эффект на персонаже — один раз (решено с пользователем 2026-10-17). Строки
    // удалённых эффектов (null) не мешают друг другу: null в unique различны.
    unique('character_effects_once').on(table.characterId, table.effectId),
    // «На ком эффект» — для предупреждений автору при удалении и скрытии.
    index('character_effects_effect_idx').on(table.effectId),
  ],
);
