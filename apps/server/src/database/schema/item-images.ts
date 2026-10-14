import { integer, jsonb, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { ThumbCrop } from 'shared';
import { items } from './items.js';

// Картинка предмета — одна, поэтому ключ — сам предмет. Байты лежат отдельно
// (item_image_files), чтобы список предметов, которому нужны только эти метаданные,
// не тащил мегабайты.
export const itemImages = pgTable('item_images', {
  itemId: uuid('item_id')
    .primaryKey()
    .references(() => items.id, { onDelete: 'cascade' }),
  // Размеры варианта full: в его пикселях задан вырез миниатюры.
  width: integer('width').notNull(),
  height: integer('height').notNull(),
  // Может выходить за края картинки — поля миниатюры прозрачные.
  thumbCrop: jsonb('thumb_crop').notNull().$type<ThumbCrop>(),
  // Растёт при замене картинки и смене выреза; клиент кладёт её в адрес файла.
  version: integer('version').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
