import { ValidateBy, type ValidationArguments } from 'class-validator';
import {
  ABILITY_CATEGORIES,
  abilityFieldsProblem,
  isAbilityActivation,
  isAbilityCosts,
  isAbilitySteps,
  isEffectComponents,
  isMonsterAbilityDetails,
  isSpellDetails,
  type AbilityCategory,
} from 'shared';
import { isEmptyDetails } from '../../catalog/category-details.validator.js';

// Что можно категории: активации, затраты, «Применение», составляющие черты
// (shared/abilityCategoryRules.ts, docs/plan/ability-categories.md). Ошибку называет
// сама проверка правил: «У черты нет затрат…».
export const AbilityFieldsFitCategory = () =>
  ValidateBy({
    name: 'abilityFieldsFitCategory',
    validator: {
      validate: (_value: unknown, args) => fieldsProblem(args) === null,
      defaultMessage: (args) => fieldsProblem(args) ?? '',
    },
  });

// Сочетание полей с категорией проверяем, только когда каждое поле верно само по себе:
// иначе ошибку назовёт его собственная проверка.
function fieldsProblem(args: ValidationArguments | undefined): string | null {
  const dto = args?.object as Record<string, unknown>;
  const { category, details, activation, costs } = dto;
  const steps = dto.steps ?? [];
  const passive = dto.passive ?? [];
  const detailsOk =
    category === 'spell'
      ? isSpellDetails(details)
      : category === 'monster'
        ? isMonsterAbilityDetails(details)
        : typeof details === 'object' &&
          details !== null &&
          isEmptyDetails(details);
  if (
    !ABILITY_CATEGORIES.includes(category as AbilityCategory) ||
    !detailsOk ||
    !isAbilityActivation(activation) ||
    !isAbilityCosts(costs) ||
    !isAbilitySteps(steps) ||
    !isEffectComponents(passive)
  )
    return null;
  return abilityFieldsProblem({
    category,
    details,
    activation,
    costs,
    steps,
    passive,
  } as Parameters<typeof abilityFieldsProblem>[0]);
}
