import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { ThumbCrop } from 'shared';
import { characters } from './characters.js';

// Метаданные картинки из галереи персонажа. Байты лежат отдельно (character_image_files),
// чтобы обычный select() галереи не тащил мегабайты.
export const characterImages = pgTable(
  'character_images',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    characterId: uuid('character_id')
      .notNull()
      .references(() => characters.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    isMain: boolean('is_main').notNull().default(false),
    // Размеры варианта full: в его пикселях задан вырез миниатюры.
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    thumbCrop: jsonb('thumb_crop').notNull().$type<ThumbCrop>(),
    thumbVersion: integer('thumb_version').notNull().default(1),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('character_images_character_idx').on(table.characterId),
    // Основная картинка у персонажа ровно одна. Указатель в characters не заводим,
    // чтобы таблицы не ссылались друг на друга по кругу.
    uniqueIndex('character_images_main_idx')
      .on(table.characterId)
      .where(sql`${table.isMain}`),
  ],
);
