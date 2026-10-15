import type { EffectVariant } from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { effects, effectImageTables } from '../database/schema/index.js';

// Каталог эффектов на общем коде каталогов (docs/plan/effects-effects.md).
export const EFFECT_ACCESS: CatalogAccess = {
  table: effects,
  id: effects.id,
  authorId: effects.authorId,
  isPublic: effects.isPublic,
  notFound: 'Эффект не найден',
  authorOnly: 'Менять эффект может только его автор',
};

// Пока есть только «Базовый» — без своих полей. Новая категория добавит свою ветку.
function toEffectVariant(): EffectVariant {
  return { category: 'basic', details: {} };
}

export const EFFECTS_CONFIG: CatalogEntriesConfig<EffectVariant> = {
  catalog: 'effect',
  table: effects,
  images: effectImageTables,
  access: EFFECT_ACCESS,
  toVariant: toEffectVariant,
};

export const EFFECT_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'effect',
  access: EFFECT_ACCESS,
  tables: effectImageTables,
  noImage: 'У эффекта нет картинки',
};
