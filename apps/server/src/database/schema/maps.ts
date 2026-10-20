import {
  pgTable,
  uuid,
  varchar,
  integer,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';
import type { Palette } from 'shared';
import { users } from './users.js';

// Шаблон карты. Блоки лежат в map_chunks, объекты — в map_objects, история изменений — в map_ops.
export const maps = pgTable('maps', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Мастер карты — единственный, кто может её менять.
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  // Индекс = id типа в клетках чанков. Только растёт (см. shared/map/palette.ts).
  palette: jsonb('palette').notNull().$type<Palette>(),
  // Размер карты в клетках: 0 ≤ x < width, 0 ≤ z < depth (docs/plan/done/map-editor.md).
  // Высота не хранится — она общая для всех карт (MAP_MAX_HEIGHT).
  width: integer('width').notNull().default(32),
  depth: integer('depth').notNull().default(32),
  // Номер последней записи журнала: клиенты сверяют по нему, не пропустили ли изменения.
  seq: integer('seq').notNull().default(0),
  // Номер следующего объекта карты (map_objects). Только растёт: отмена удаления
  // старого объекта вернула бы его под номером, который уже занял новый.
  nextObjectId: integer('next_object_id').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
