import {
  DEFAULT_ABILITY_FIELDS,
  activationFitsCategory,
  isAbilityActivation,
  isAbilityCosts,
  isEffectComponents,
  isMonsterAbilityDetails,
  isSpellDetails,
  readAbilitySteps,
  withoutStepEffects,
  type AbilityFields,
  type AbilityVariant,
} from 'shared';
import type { CatalogAccess } from '../catalog/catalog-access.js';
import type { CatalogEntriesConfig } from '../catalog/entries/catalog-entries.service.js';
import type { CatalogImageConfig } from '../catalog/images/catalog-image.config.js';
import { abilities, abilityImageTables } from '../database/schema/index.js';
import type { AbilityDto } from './dto/ability.dto.js';

// Каталог способностей на общем коде каталогов (docs/plan/done/abilities-effects.md).
export const ABILITY_ACCESS: CatalogAccess = {
  table: abilities,
  id: abilities.id,
  authorId: abilities.authorId,
  isPublic: abilities.isPublic,
  notFound: 'Способность не найдена',
  authorOnly: 'Менять способность может только её автор',
};

export type AbilityRecordFields = AbilityVariant & AbilityFields;

// «Базовая» — без своих полей, у «Заклинания» — круг, школа и прочее (shared/abilitySpell.ts),
// у «Монстра» — перезарядка (shared/abilityMonster.ts); запись с испорченными полями
// категории читается как «Базовая», чтобы карточка открылась.
// Активация, затраты и шаги «Применения» лежат в extra; у записей без них (или с
// испорченными) — значения по умолчанию: действие, без затрат, без шагов. Испорченный шаг
// пропускается, остальные остаются. Легендарное действие не у «Монстра» и черта у
// заклинания тоже читаются как действие. Составляющие черты (passive) — только у черты:
// у записей до них и у других активаций — пустой список.
export function toAbilityVariant(
  category: string,
  details: Record<string, unknown>,
  extra: Record<string, unknown>,
): AbilityRecordFields {
  const variant: AbilityVariant =
    category === 'spell' && isSpellDetails(details)
      ? { category, details }
      : category === 'monster' && isMonsterAbilityDetails(details)
        ? { category, details }
        : { category: 'basic', details: {} };
  const activation =
    isAbilityActivation(extra.activation) &&
    activationFitsCategory(variant.category, extra.activation)
      ? extra.activation
      : DEFAULT_ABILITY_FIELDS.activation;
  return {
    ...variant,
    activation,
    costs: isAbilityCosts(extra.costs)
      ? extra.costs
      : DEFAULT_ABILITY_FIELDS.costs,
    steps: readAbilitySteps(extra.steps),
    passive:
      activation.kind === 'trait' && isEffectComponents(extra.passive)
        ? extra.passive
        : DEFAULT_ABILITY_FIELDS.passive,
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
      // Эффекты шагов — в таблице ability_step_effects (StepEffectsService), не здесь.
      steps: (dto.steps ?? []).map(withoutStepEffects),
      passive: dto.passive ?? [],
    },
  }),
};

export const ABILITY_IMAGE_CONFIG: CatalogImageConfig = {
  catalog: 'ability',
  access: ABILITY_ACCESS,
  tables: abilityImageTables,
  noImage: 'У способности нет картинки',
};
