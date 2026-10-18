import { IsBoolean, IsIn, IsOptional, ValidateBy } from 'class-validator';
import {
  ABILITY_CATEGORIES,
  isAbilityActivation,
  isAbilityCosts,
  isAbilitySteps,
  isSpellDetails,
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
import { SpellSlotFitsLevel } from './spell-slot.validator.js';

// Создание и полное редактирование способности — одно и то же тело.
export class AbilityDto extends CatalogEntryDto {
  @IsIn(ABILITY_CATEGORIES, { message: 'Неизвестная категория способности' })
  category: AbilityCategory;

  @CategoryDetails<AbilityCategory>(
    { basic: isEmptyDetails, spell: isSpellDetails },
    { spell: 'Поля заклинания заданы неверно' },
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
  @SpellSlotFitsLevel()
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

  // Флаг одного запроса, в способности не хранится (docs/plan/done/abilities.md, этап 8).
  // Опубликовать вместе со способностью свои скрытые эффекты из её шагов — иначе 409.
  @IsOptional()
  @IsBoolean({ message: 'Признак «опубликовать эффекты» — да или нет' })
  publishEffects?: boolean;
}
