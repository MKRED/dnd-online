import {
  DEFAULT_EFFECT_DURATION,
  isEffectDuration,
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

// Пока есть только «Базовый» — без своих полей. Новая категория добавит свою ветку.
// Длительность лежит в extra; у записей, созданных до неё, её нет — они бессрочные.
export function toEffectVariant(
  _category: string,
  _details: Record<string, unknown>,
  extra: Record<string, unknown>,
): EffectRecordFields {
  return {
    category: 'basic',
    details: {},
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
