import {
  DEFAULT_EFFECT_DURATION,
  isEffectDuration,
  isSenseDetails,
  type EffectFields,
  type EffectVariant,
} from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { effects, effectImageTables } from '../database/schema/index.js';
import type { EffectDto } from './dto/effect.dto.js';

// Каталог эффектов на общем коде каталогов (docs/plan/abilities-effects.md).
export const EFFECT_ACCESS: CatalogAccess = {
  table: effects,
  id: effects.id,
  authorId: effects.authorId,
  isPublic: effects.isPublic,
  notFound: 'Эффект не найден',
  authorOnly: 'Менять эффект может только его автор',
};

export type EffectRecordFields = EffectVariant & EffectFields;

// Категория и её поля из базы. Неизвестную категорию или испорченные поля читаем как
// «Базовый»: описание остаётся, а каталог не падает из-за одной записи.
function toCategory(
  category: string,
  details: Record<string, unknown>,
): EffectVariant {
  if (category === 'sense' && isSenseDetails(details)) {
    return { category: 'sense', details };
  }
  return { category: 'basic', details: {} };
}

// Длительность лежит в extra; у записей, созданных до неё, её нет — они бессрочные.
export function toEffectVariant(
  category: string,
  details: Record<string, unknown>,
  extra: Record<string, unknown>,
): EffectRecordFields {
  return {
    ...toCategory(category, details),
    duration: isEffectDuration(extra.duration)
      ? extra.duration
      : DEFAULT_EFFECT_DURATION,
  };
}

export const EFFECTS_CONFIG: CatalogEntriesConfig<
  EffectRecordFields,
  EffectDto
> = {
  catalog: 'effect',
  table: effects,
  images: effectImageTables,
  access: EFFECT_ACCESS,
  toVariant: toEffectVariant,
  toExtra: (dto) => ({ duration: dto.duration }),
};

export const EFFECT_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'effect',
  access: EFFECT_ACCESS,
  tables: effectImageTables,
  noImage: 'У эффекта нет картинки',
};
