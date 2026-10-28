import { IsBoolean, IsIn, IsOptional, ValidateBy } from 'class-validator';
import {
  ABILITY_CATEGORIES,
  abilityStepsProblem,
  isAbilityActivation,
  isAbilityCosts,
  isAbilitySteps,
  isEffectComponents,
  isMonsterAbilityDetails,
  isSpellDetails,
  passiveFitsActivation,
  type AbilityActivation,
  type AbilityCategory,
  type AbilityCosts,
  type AbilityStep,
  type EffectComponent,
} from 'shared';
import {
  CategoryDetails,
  isEmptyDetails,
} from '../../catalog/category-details.validator.js';
import { CatalogEntryDto } from '../../catalog/entries/dto/catalog-entry.dto.js';
import { AbilityFieldsFitCategory } from './ability-fields.validator.js';
import { SpellSlotFitsLevel } from './spell-slot.validator.js';

// Создание и полное редактирование способности — одно и то же тело.
export class AbilityDto extends CatalogEntryDto {
  @IsIn(ABILITY_CATEGORIES, { message: 'Неизвестная категория способности' })
  @AbilityFieldsFitCategory()
  category: AbilityCategory;

  @CategoryDetails<AbilityCategory>(
    {
      basic: isEmptyDetails,
      feature: isEmptyDetails,
      spell: isSpellDetails,
      monster: isMonsterAbilityDetails,
    },
    {
      spell: 'Поля заклинания заданы неверно',
      monster: 'Поля способности монстра заданы неверно',
    },
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
      // Форма проверяет шаги сама, сюда доходит запрос в обход неё (MCP): называем поле.
      defaultMessage: (args) =>
        `Применение способности задано неверно: ${abilityStepsProblem(args?.value)}`,
    },
  })
  steps?: AbilityStep[];

  // Что черта даёт владельцу всегда (shared/abilityPassive.ts). Необязательно: без поля —
  // пустой список, как у запросов, написанных до черт персонажа.
  @IsOptional()
  @ValidateBy({
    name: 'abilityPassive',
    validator: {
      validate: isEffectComponents,
      defaultMessage: () => 'Составляющие черты заданы неверно',
    },
  })
  @ValidateBy({
    name: 'passiveFitsActivation',
    validator: {
      validate: (value: unknown, args) => {
        const { activation } = args?.object as { activation?: unknown };
        if (!isEffectComponents(value) || !isAbilityActivation(activation))
          return true;
        return passiveFitsActivation(activation, value);
      },
      defaultMessage: () => 'Составляющие бывают только у черты',
    },
  })
  passive?: EffectComponent[];

  // Флаг одного запроса, в способности не хранится (docs/plan/done/abilities.md, этап 8).
  // Опубликовать вместе со способностью свои скрытые эффекты из её шагов — иначе 409.
  @IsOptional()
  @IsBoolean({ message: 'Признак «опубликовать эффекты» — да или нет' })
  publishEffects?: boolean;
}
