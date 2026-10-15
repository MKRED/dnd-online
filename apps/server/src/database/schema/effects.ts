import { catalogEntryTable, catalogImageTables } from './catalog-tables.js';

// Каталог эффектов (docs/plan/effects.md) и картинки эффектов.
export const effects = catalogEntryTable('effects');
export const effectImageTables = catalogImageTables(
  'effect',
  'effect_id',
  () => effects.id,
);
export const effectImages = effectImageTables.images;
export const effectImageFiles = effectImageTables.files;
