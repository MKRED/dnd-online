import { index, integer, pgTable, uuid } from 'drizzle-orm/pg-core';
import type { Facing } from 'shared';
import { characters } from './characters.js';
import { gameScenes } from './game-scenes.js';
import { games } from './games.js';

// Фигурка персонажа на сцене (docs/plan/done/game.md, этап 7). Персонаж — только в одной
// игре, и фигурка у него одна: она живёт на активной сцене, а при смене сцены встаёт на
// стартовые точки новой. Персонажа на месте без строки здесь мастер ставит сам.
export const gameFigures = pgTable(
  'game_figures',
  {
    characterId: uuid('character_id')
      .primaryKey()
      .references(() => characters.id, { onDelete: 'cascade' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => gameScenes.id, { onDelete: 'cascade' }),
    // Клетка ног, как у объекта карты.
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    z: integer('z').notNull(),
    facing: integer('facing').notNull().$type<Facing>(),
    // Запас движения на раунд: пройдено футов и взято «Рывков». «Новый раунд» обнуляет.
    moved: integer('moved').notNull().default(0),
    dashes: integer('dashes').notNull().default(0),
  },
  (table) => [index('game_figures_game_idx').on(table.gameId)],
);
