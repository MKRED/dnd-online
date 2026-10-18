import { pgTable, primaryKey, uuid, varchar } from 'drizzle-orm/pg-core';
import type { CharacterImageVariant } from 'shared';
import { bytea } from './bytea.js';
import { characterImages } from './character-images.js';

// Байты картинки, по строке на вариант (full, preview, thumb), всегда WebP.
// Храним в базе, а не на диске: dev и prod смотрят в одну базу, и файл, загруженный
// локально, иначе не существовал бы в проде (docs/plan/done/character-images.md).
export const characterImageFiles = pgTable(
  'character_image_files',
  {
    imageId: uuid('image_id')
      .notNull()
      .references(() => characterImages.id, { onDelete: 'cascade' }),
    variant: varchar('variant', { length: 10 })
      .$type<CharacterImageVariant>()
      .notNull(),
    data: bytea('data').notNull(),
  },
  (table) => [primaryKey({ columns: [table.imageId, table.variant] })],
);
