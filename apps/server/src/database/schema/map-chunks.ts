import { integer, pgTable, primaryKey, uuid } from 'drizzle-orm/pg-core';
import { bytea } from './bytea.js';
import { maps } from './maps.js';

// Чанк 16×16×16 карты в формате encodeChunk (shared). Пустые чанки не хранятся.
export const mapChunks = pgTable(
  'map_chunks',
  {
    mapId: uuid('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    cx: integer('cx').notNull(),
    cy: integer('cy').notNull(),
    cz: integer('cz').notNull(),
    data: bytea('data').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.mapId, table.cx, table.cy, table.cz] }),
  ],
);
