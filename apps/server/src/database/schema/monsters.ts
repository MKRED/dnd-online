import { catalogEntryTable, catalogImageTables } from './catalog-tables.js';

// Каталог монстров (docs/plan/monsters-npcs.md): category — тип существа, стат-блок и
// роль — в extra. Картинка потом станет токеном на карте.
export const monsters = catalogEntryTable('monsters');
export const monsterImageTables = catalogImageTables(
  'monster',
  'monster_id',
  () => monsters.id,
);
export const monsterImages = monsterImageTables.images;
export const monsterImageFiles = monsterImageTables.files;
