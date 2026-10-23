import { catalogEntryTable, catalogImageTables } from './catalog-tables.js';

// Справочник «Обстановка» (docs/plan/blocks.md, этап 8б): роль поверх модели — id своей
// модели и крепление в extra. Таблицы картинок нужны общему коду каталогов, как у моделей.
export const furniture = catalogEntryTable('furniture');
export const furnitureImageTables = catalogImageTables(
  'furniture',
  'furniture_id',
  () => furniture.id,
);
export const furnitureImages = furnitureImageTables.images;
export const furnitureImageFiles = furnitureImageTables.files;
