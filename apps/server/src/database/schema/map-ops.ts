import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { MapOp, PackedChangeset } from 'shared';
import { maps } from './maps.js';
import { users } from './users.js';

// Changeset журнала хранится в компактном виде (см. PackedChangeset в shared).
export type StoredChangeset = PackedChangeset;

export type MapJournalKind = 'op' | 'undo' | 'redo';

// Журнал изменений карты. Каждая запись хранит changeset, который реально применился,
// в прямом виде — в том числе undo (без клеток-конфликтов). Поэтому любую запись
// клиент воспроизводит одинаково: applyChangeset(..., 'forward').
export const mapOps = pgTable(
  'map_ops',
  {
    mapId: uuid('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    kind: varchar('kind', { length: 10 }).notNull().$type<MapJournalKind>(),
    // Для undo/redo — seq записи-операции, которую отменили или вернули.
    targetSeq: integer('target_seq'),
    // Исходные операции пачки — для истории и отладки, не для воспроизведения.
    ops: jsonb('ops').$type<MapOp[]>(),
    changeset: jsonb('changeset').notNull().$type<StoredChangeset>(),
    // Только у записей-операций: отменена ли сейчас.
    undone: boolean('undone').notNull().default(false),
    authorId: uuid('author_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.mapId, table.seq] })],
);
