import { IsIn, IsOptional, ValidateBy } from 'class-validator';
import {
  ABILITY_CATEGORIES,
  isAbilityActivation,
  isAbilityCosts,
  isAbilitySteps,
  type AbilityActivation,
  type AbilityCategory,
  type AbilityCosts,
  type AbilityStep,
} from 'shared';
import {
  CategoryDetails,
  isEmptyDetails,
} from '../../catalog/category-details.validator.js';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';

// Создание и полное редактирование способности — одно и то же тело.
export class AbilityDto extends CatalogEntryDto {
  @IsIn(ABILITY_CATEGORIES, { message: 'Неизвестная категория способности' })
  category: AbilityCategory;

  @CategoryDetails<AbilityCategory>(
    { basic: isEmptyDetails },
    {},
    'Поля способности не подходят к её категории',
  )
  details: object;

  // Активация и затраты — общие поля всех способностей, обязательны. Виды и пределы — в
  // shared (abilityUsage.ts).
  @ValidateBy({
    name: 'abilityActivation',
    validator: {
      validate: isAbilityActivation,
      defaultMessage: () => 'Активация способности задана неверно',
    },
  })
  activation: AbilityActivation;

  @ValidateBy({
    name: 'abilityCosts',
    validator: {
      validate: isAbilityCosts,
      defaultMessage: () => 'Затраты способности заданы неверно',
    },
  })
  costs: AbilityCosts;

  // «Применение» (abilitySteps.ts). Необязательно: без поля — пустой список, как у
  // запросов, написанных до этапа 3.
  @IsOptional()
  @ValidateBy({
    name: 'abilitySteps',
    validator: {
      validate: isAbilitySteps,
      defaultMessage: () => 'Применение способности задано неверно',
    },
  })
  steps?: AbilityStep[];
}
