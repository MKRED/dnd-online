import {
  integer,
  jsonb,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { CharacterModelFit, CharacterModelFormat } from 'shared';
import { bytea } from './bytea.js';
import { characters } from './characters.js';

// 3D-модель персонажа (docs/plan/done/character-models.md): одна на персонажа, загрузка
// заменяет. Байты в базе, как у картинок: dev и prod смотрят в одну базу. Чтения
// метаданных выбирают колонки явно, без data.
export const characterModels = pgTable('character_models', {
  characterId: uuid('character_id')
    .primaryKey()
    .references(() => characters.id, { onDelete: 'cascade' }),
  format: varchar('format', { length: 8 })
    .$type<CharacterModelFormat>()
    .notNull(),
  size: integer('size').notNull(),
  version: integer('version').notNull().default(1),
  // Цвет фигурки из STL; у .glb свои цвета — null.
  color: varchar('color', { length: 7 }),
  fit: jsonb('fit').notNull().$type<CharacterModelFit>(),
  data: bytea('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
