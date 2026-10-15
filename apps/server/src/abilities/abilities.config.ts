import type { AbilityVariant } from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { abilities, abilityImageTables } from '../database/schema/index.js';

// Каталог способностей на общем коде каталогов (docs/plan/abilities-effects.md).
export const ABILITY_ACCESS: CatalogAccess = {
  table: abilities,
  id: abilities.id,
  authorId: abilities.authorId,
  isPublic: abilities.isPublic,
  notFound: 'Способность не найдена',
  authorOnly: 'Менять способность может только её автор',
};

// Пока есть только «Базовая» — без своих полей. Новая категория добавит свою ветку.
function toAbilityVariant(): AbilityVariant {
  return { category: 'basic', details: {} };
}

export const ABILITIES_CONFIG: CatalogEntriesConfig<AbilityVariant> = {
  catalog: 'ability',
  table: abilities,
  images: abilityImageTables,
  access: ABILITY_ACCESS,
  toVariant: toAbilityVariant,
};

export const ABILITY_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'ability',
  access: ABILITY_ACCESS,
  tables: abilityImageTables,
  noImage: 'У способности нет картинки',
};
