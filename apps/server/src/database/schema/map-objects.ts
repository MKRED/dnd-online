import {
  boolean,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { MapObjectKind } from 'shared';
import { maps } from './maps.js';

// Объекты шаблона карты (docs/plan/map-objects.md): старты, существа, контейнеры,
// предметы на полу. Меняются только операциями журнала, как блоки, — отдельного CRUD нет.
// Ссылки на каталог лежат в fields без внешних ключей: отмена может вернуть ссылку на
// удалённое, и это заглушка, а не ошибка.
export const mapObjects = pgTable(
  'map_objects',
  {
    mapId: uuid('map_id')
      .notNull()
      .references(() => maps.id, { onDelete: 'cascade' }),
    // Номер внутри карты из счётчика maps.next_object_id, не переиспользуется.
    id: integer('id').notNull(),
    kind: varchar('kind', { length: 20 }).notNull().$type<MapObjectKind>(),
    x: integer('x').notNull(),
    y: integer('y').notNull(),
    z: integer('z').notNull(),
    hidden: boolean('hidden').notNull().default(false),
    // Поля вида (взгляд, ссылки, содержимое) — как в MapObjectBody без kind.
    fields: jsonb('fields').notNull().$type<Record<string, unknown>>(),
  },
  (table) => [primaryKey({ columns: [table.mapId, table.id] })],
);
