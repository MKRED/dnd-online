import {
  customType,
  integer,
  pgTable,
  primaryKey,
  uuid,
} from 'drizzle-orm/pg-core';
import { maps } from './maps.js';

// В drizzle 0.45 нет встроенного bytea. pg и так отдаёт/принимает Buffer — тип нужен
// только для схемы и TS.
const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => 'bytea',
});

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
