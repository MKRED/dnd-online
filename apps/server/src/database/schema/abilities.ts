import { catalogEntryTable, catalogImageTables } from './catalog-tables.js';

// Каталог способностей (docs/plan/abilities.md) и картинки способностей.
export const abilities = catalogEntryTable('abilities');
export const abilityImageTables = catalogImageTables(
  'ability',
  'ability_id',
  () => abilities.id,
);
export const abilityImages = abilityImageTables.images;
export const abilityImageFiles = abilityImageTables.files;
