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

// Шаблон карты. Блоки лежат в map_chunks, история изменений — в map_ops.
export const maps = pgTable('maps', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Мастер карты — единственный, кто может её менять.
  ownerId: uuid('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  // Индекс = id типа в клетках чанков. Только растёт (см. shared/map/palette.ts).
  palette: jsonb('palette').notNull().$type<Palette>(),
  // Номер последней записи журнала: клиенты сверяют по нему, не пропустили ли изменения.
  seq: integer('seq').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
