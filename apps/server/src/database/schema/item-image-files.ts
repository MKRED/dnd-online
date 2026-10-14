import { pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';
import type { ItemImageVariant } from 'shared';
import { bytea } from './bytea.js';
import { itemImages } from './item-images.js';

// Байты картинки предмета, по строке на вариант (full, thumb), всегда WebP. В базе, а не
// на диске — по той же причине, что у персонажей (docs/plan/character-images.md).
export const itemImageFiles = pgTable(
  'item_image_files',
  {
    itemId: uuid('item_id')
      .notNull()
      .references(() => itemImages.itemId, { onDelete: 'cascade' }),
    variant: varchar('variant', { length: 10 })
      .$type<ItemImageVariant>()
      .notNull(),
    data: bytea('data').notNull(),
  },
  (table) => [primaryKey({ columns: [table.itemId, table.variant] })],
);
