import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import type { D20Roll } from 'shared';
import { characters } from './characters.js';
import { gameScenes } from './game-scenes.js';
import { games } from './games.js';

// Участник боя на сцене (docs/plan/combat.md, этап 2): фигурка персонажа (character_id) или
// монстр/НПС сцены (object_id — номер объекта, без внешнего ключа, как у game_creatures).
// Бой живёт на активной сцене: смена сцены и конец боя убирают участников.
export const gameCombatants = pgTable(
  'game_combatants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => gameScenes.id, { onDelete: 'cascade' }),
    characterId: uuid('character_id').references(() => characters.id, {
      onDelete: 'cascade',
    }),
    objectId: integer('object_id'),
    // Врасплох — помеха на бросок инициативы (внезапность 2024).
    surprised: boolean('surprised').notNull().default(false),
    // Итог инициативы и модификатор инициативы для ничьих; null — ещё не бросал.
    initiative: integer('initiative'),
    modifier: integer('modifier'),
    // Бросок со слагаемыми; null — не бросал или число поставил мастер.
    roll: jsonb('roll').$type<D20Roll>(),
    // Место в очереди с 0; у не бросивших null. Перестановка мастера переписывает места.
    place: integer('place'),
    // Когда позван: порядок не бросивших. clock_timestamp, а не now(): участники одного
    // «Начать бой» входят в одной транзакции, и now() у них был бы одинаковым.
    joinedAt: timestamp('joined_at', { withTimezone: true })
      .notNull()
      .default(sql`clock_timestamp()`),
  },
  (table) => [
    index('game_combatants_game_idx').on(table.gameId),
    unique('game_combatants_figure').on(table.sceneId, table.characterId),
    unique('game_combatants_creature').on(table.sceneId, table.objectId),
    check(
      'game_combatants_ref',
      sql`(${table.characterId} is null) <> (${table.objectId} is null)`,
    ),
  ],
);
