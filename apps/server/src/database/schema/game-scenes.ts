import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { SIGHT_RANGE_DEFAULT, type MapObjectKind, type Palette } from 'shared';
import { bytea } from './bytea.js';
import { games } from './games.js';
import { maps } from './maps.js';

// Сцена игры (docs/plan/done/game.md, «Сцены и смена карты на ходу»): копия карты мастера.
// Колонки повторяют maps, чанки и объекты — map_chunks и map_objects: операции карты
// (этап 6) не знают, где лежат чанки, и правят сцену тем же кодом.
export const gameScenes = pgTable(
  'game_scenes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    // Шаблон, из которого скопирована сцена: по нему её перезапускают. Удалили карту —
    // сцена остаётся, перезапустить её нельзя.
    mapId: uuid('map_id').references(() => maps.id, { onDelete: 'set null' }),
    // Имя карты на момент копии.
    name: varchar('name', { length: 100 }).notNull(),
    palette: jsonb('palette').notNull().$type<Palette>(),
    width: integer('width').notNull(),
    depth: integer('depth').notNull(),
    // Номер последней правки сцены — как maps.seq; правки пойдут с этапа 6.
    seq: integer('seq').notNull().default(0),
    nextObjectId: integer('next_object_id').notNull(),
    // Активная сцена игры одна (индекс ниже). Флаг у сцены, а не ссылка из games:
    // таблицы не ссылаются друг на друга по кругу.
    active: boolean('active').notNull().default(false),
    // Туман войны (docs/plan/fog-of-war.md): включён ли и дальность обзора в футах.
    // Выключен — игроки видят сцену целиком, как до тумана.
    fog: boolean('fog').notNull().default(false),
    sightRange: integer('sight_range').notNull().default(SIGHT_RANGE_DEFAULT),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Сцену перезапустили: новая копия встала на её место, старая осталась для
    // журнала и в список мастера не попадает.
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => [
    index('game_scenes_game_idx').on(table.gameId),
    uniqueIndex('game_scenes_active_idx')
      .on(table.gameId)
      .where(sql`${table.active}`),
  ],
);

// Чанк сцены — как map_chunks.
export const gameSceneChunks = pgTable(
  'game_scene_chunks',
  {
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => gameScenes.id, { onDelete: 'cascade' }),
    cx: integer('cx').notNull(),
    cy: integer('cy').notNull(),
    cz: integer('cz').notNull(),
    data: bytea('data').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sceneId, table.cx, table.cy, table.cz] }),
  ],
);

// Туман войны сцены: что группа уже открыла и что видит сейчас — битовые маски по
// чанку, 16³ бит = 512 байт, бит с тем же индексом, что у клетки в чанке
// (shared/src/map/rules/vision). Строки нет — в чанке ничего не открыто.
export const gameSceneFog = pgTable(
  'game_scene_fog',
  {
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => gameScenes.id, { onDelete: 'cascade' }),
    cx: integer('cx').notNull(),
    cy: integer('cy').notNull(),
    cz: integer('cz').notNull(),
    explored: bytea('explored').notNull(),
    visible: bytea('visible').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.sceneId, table.cx, table.cy, table.cz] }),
  ],
);

// Объект сцены — как map_objects; номера — те же, что в карте на момент копии.
export const gameSceneObjects = pgTable(
  'game_scene_objects',
  {
    sceneId: uuid('scene_id')
      .notNull()
      .references(() => gameScenes.id, { onDelete: 'cascade' }),
    id: integer('id').notNull(),
    kind: varchar('kind', { length: 20 }).notNull().$type<MapObjectKind>(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    z: integer('z').notNull(),
    // Видит только мастер: игрокам сервер такой объект не отдаёт.
    hidden: boolean('hidden').notNull().default(false),
    fields: jsonb('fields').notNull().$type<Record<string, unknown>>(),
  },
  (table) => [primaryKey({ columns: [table.sceneId, table.id] })],
);
