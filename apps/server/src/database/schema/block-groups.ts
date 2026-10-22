import { catalogEntryTable, catalogImageTables } from './catalog-tables.js';

// Справочник своих блоков (docs/plan/blocks.md, этап 3): группа — запись каталога, её
// свойства для правил лежат в details, вид (базовый материал и основной цвет) — в extra.
// Блоки группы — её формы; на карте они называются по id группы (shared/customBlocks.ts).
export const blockGroups = catalogEntryTable('block_groups');
export const blockGroupImageTables = catalogImageTables(
  'block_group',
  'block_group_id',
  () => blockGroups.id,
);
export const blockGroupImages = blockGroupImageTables.images;
export const blockGroupImageFiles = blockGroupImageTables.files;
