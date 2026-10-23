import {
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { ModelMeshFormat } from 'shared';
import { bytea } from './bytea.js';
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

// Загруженный файл модели (docs/plan/blocks.md, этап 9): `.glb` или STL, один на модель,
// загрузка заменяет. Байты в базе, как у моделей персонажей; что нарисовать и как вписать
// (формат, версия, цвет, поворот), лежит в extra модели — его видят все, кто видит
// модель. Чтения выбирают колонки явно, без data.
export const voxelModelMeshes = pgTable('voxel_model_meshes', {
  modelId: uuid('model_id')
    .primaryKey()
    .references(() => voxelModels.id, { onDelete: 'cascade' }),
  format: varchar('format', { length: 8 }).$type<ModelMeshFormat>().notNull(),
  size: integer('size').notNull(),
  data: bytea('data').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
