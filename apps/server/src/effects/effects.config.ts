import {
  DEFAULT_EFFECT_DURATION,
  isEffectDuration,
  isEffectSaveEnds,
  isSenseDetails,
  readEffectComponents,
  type EffectAbilities,
  type EffectComponent,
  type EffectFields,
} from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { effects, effectImageTables } from '../database/schema/index.js';
import type { EffectDto } from './dto/effect.dto.js';

// Каталог эффектов на общем коде каталогов (docs/plan/abilities-effects.md).

// abilities — только у автора в карточке: какие способности накладывают эффект.
export type EffectRecordFields = EffectFields & { abilities?: EffectAbilities };
export const EFFECT_ACCESS: CatalogAccess = {
  table: effects,
  id: effects.id,
  authorId: effects.authorId,
  isPublic: effects.isPublic,
  notFound: 'Эффект не найден',
  authorOnly: 'Менять эффект может только его автор',
};

// Составляющие лежат в details.components, колонка category у эффекта — всегда 'basic':
// так новые записи безвредно читает и сервер, выпущенный до составляющих.
const STORED_CATEGORY = 'basic';

// Составляющие из базы. Недостающие поля получают умолчания, испорченная составляющая
// пропускается (readEffectComponents): каталог не падает из-за одной записи. До
// составляющих у эффекта была категория: «Чувство» с полями в details — это одна
// составляющая.
function toComponents(
  category: string,
  details: Record<string, unknown>,
): EffectComponent[] {
  if (Array.isArray(details.components)) {
    return readEffectComponents(details.components);
  }
  if (category === 'sense' && isSenseDetails(details)) {
    return [{ kind: 'sense', ...details }];
  }
  return [];
}

// Длительность и снятие спасброском лежат в extra; у записей, созданных до них, их нет —
// такие эффекты бессрочные и спасброском не снимаются.
export function toEffectFields(
  category: string,
  details: Record<string, unknown>,
  extra: Record<string, unknown>,
): EffectFields {
  return {
    components: toComponents(category, details),
    duration: isEffectDuration(extra.duration)
      ? extra.duration
      : DEFAULT_EFFECT_DURATION,
    saveEnds:
      extra.saveEnds !== undefined && isEffectSaveEnds(extra.saveEnds)
        ? extra.saveEnds
        : null,
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
  toVariant: toEffectFields,
  toStored: (dto) => ({
    category: STORED_CATEGORY,
    details: { components: dto.components },
    extra: { duration: dto.duration, saveEnds: dto.saveEnds },
  }),
};

export const EFFECT_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'effect',
  access: EFFECT_ACCESS,
  tables: effectImageTables,
  noImage: 'У эффекта нет картинки',
};
