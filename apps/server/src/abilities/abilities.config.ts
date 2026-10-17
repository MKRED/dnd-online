import {
  DEFAULT_ABILITY_FIELDS,
  isAbilityActivation,
  isAbilityCosts,
  isSpellDetails,
  readAbilitySteps,
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

// «Базовая» — без своих полей, у «Заклинания» — круг, школа и прочее (shared/abilitySpell.ts);
// заклинание с испорченными полями читается как «Базовая», чтобы карточка открылась.
// Активация, затраты и шаги «Применения» лежат в extra; у записей без них (или с
// испорченными) — значения по умолчанию: действие, без затрат, без шагов. Испорченный шаг
// пропускается, остальные остаются.
export function toAbilityVariant(
  category: string,
  details: Record<string, unknown>,
  extra: Record<string, unknown>,
): AbilityRecordFields {
  const variant: AbilityVariant =
    category === 'spell' && isSpellDetails(details)
      ? { category, details }
      : { category: 'basic', details: {} };
  return {
    ...variant,
    activation: isAbilityActivation(extra.activation)
      ? extra.activation
      : DEFAULT_ABILITY_FIELDS.activation,
    costs: isAbilityCosts(extra.costs)
      ? extra.costs
      : DEFAULT_ABILITY_FIELDS.costs,
    steps: readAbilitySteps(extra.steps),
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
  toStored: (dto) => ({
    category: dto.category,
    // Копия, а не сам объект: у интерфейсов полей нет индексной сигнатуры, которую ждёт
    // колонка.
    details: { ...dto.details },
    extra: {
      activation: dto.activation,
      costs: dto.costs,
      steps: dto.steps ?? [],
    },
  }),
};

export const ABILITY_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'ability',
  access: ABILITY_ACCESS,
  tables: abilityImageTables,
  noImage: 'У способности нет картинки',
};
