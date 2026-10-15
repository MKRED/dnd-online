import {
  DEFAULT_ABILITY_FIELDS,
  isAbilityActivation,
  isAbilityCosts,
  type AbilityFields,
  type AbilityVariant,
} from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { abilities, abilityImageTables } from '../database/schema/index.js';
import type { AbilityDto } from './dto/ability.dto.js';

// Каталог способностей на общем коде каталогов (docs/plan/abilities-effects.md).
export const ABILITY_ACCESS: CatalogAccess = {
  table: abilities,
  id: abilities.id,
  authorId: abilities.authorId,
  isPublic: abilities.isPublic,
  notFound: 'Способность не найдена',
  authorOnly: 'Менять способность может только её автор',
};

export type AbilityRecordFields = AbilityVariant & AbilityFields;

// Пока есть только «Базовая» — без своих полей. Новая категория добавит свою ветку.
// Активация и затраты лежат в extra; у записей без них (или с испорченными) — значения
// по умолчанию: действие, без затрат.
export function toAbilityVariant(
  _category: string,
  _details: Record<string, unknown>,
  extra: Record<string, unknown>,
): AbilityRecordFields {
  return {
    category: 'basic',
    details: {},
    activation: isAbilityActivation(extra.activation)
      ? extra.activation
      : DEFAULT_ABILITY_FIELDS.activation,
    costs: isAbilityCosts(extra.costs)
      ? extra.costs
      : DEFAULT_ABILITY_FIELDS.costs,
  };
}

export const ABILITIES_CONFIG: CatalogEntriesConfig<
  AbilityRecordFields,
  AbilityDto
> = {
  catalog: 'ability',
  table: abilities,
  images: abilityImageTables,
  access: ABILITY_ACCESS,
  toVariant: toAbilityVariant,
  toExtra: (dto) => ({ activation: dto.activation, costs: dto.costs }),
};

export const ABILITY_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'ability',
  access: ABILITY_ACCESS,
  tables: abilityImageTables,
  noImage: 'У способности нет картинки',
};
