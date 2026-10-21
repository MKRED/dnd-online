import {
  index,
  integer,
  pgTable,
  primaryKey,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { gameScenes } from './game-scenes.js';

// Монстр или НПС на сцене — экземпляр со своим состоянием (docs/plan/game.md, этап 8).
// Строка появляется с первой правкой: без неё у существа полные хиты из копии в
// библиотеке. Ключ — номер объекта сцены, без внешнего ключа: убранный и возвращённый
// отменой объект сохраняет своё состояние. Перезапуск сцены — новая сцена, все снова целы.
export const gameCreatures = pgTable(
  'game_creatures',
  {
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => gameScenes.id, { onDelete: 'cascade' }),
    objectId: integer('object_id').notNull(),
    hitPointsCurrent: integer('hit_points_current').notNull(),
    hitPointsTemp: integer('hit_points_temp').notNull().default(0),
  },
  (table) => [primaryKey({ columns: [table.sceneId, table.objectId] })],
);

// Эффект, наложенный на экземпляр в игре. effect_id — исходный id копии в библиотеке
// игры (вид effect), без внешнего ключа: игра читает только копию.
export const gameCreatureEffects = pgTable(
  'game_creature_effects',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => gameScenes.id, { onDelete: 'cascade' }),
    objectId: integer('object_id').notNull(),
    effectId: uuid('effect_id').notNull(),
    addedAt: timestamp('added_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    unique('game_creature_effects_once').on(
      table.sceneId,
      table.objectId,
      table.effectId,
    ),
    index('game_creature_effects_scene_idx').on(table.sceneId),
  ],
);
