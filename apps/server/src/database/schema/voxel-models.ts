import { catalogEntryTable, catalogImageTables } from './catalog-tables.js';

// Справочник «Модели» (docs/plan/blocks.md, этап 8а): модель из вокселей — запись
// каталога, её размер, палитра, воксели и свойства клеток лежат в extra. Картинки записи
// у моделей нет (картинка — сама модель), но таблицы картинок нужны общему коду
// каталогов: он читает запись вместе с ними.
export const voxelModels = catalogEntryTable('voxel_models');
export const voxelModelImageTables = catalogImageTables(
  'voxel_model',
  'voxel_model_id',
  () => voxelModels.id,
);
export const voxelModelImages = voxelModelImageTables.images;
export const voxelModelImageFiles = voxelModelImageTables.files;
