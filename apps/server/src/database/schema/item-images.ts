import { catalogImageTables } from './catalog-tables.js';
import { items } from './items.js';

// Картинка предмета: метаданные (item_images) и байты по вариантам (item_image_files).
// Устроены как у любого каталога (catalog-tables.ts).
export const itemImageTables = catalogImageTables(
  'item',
  'item_id',
  () => items.id,
);
export const itemImages = itemImageTables.images;
export const itemImageFiles = itemImageTables.files;
