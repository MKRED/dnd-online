import {
  ABILITY_STEPS_MAX,
  ATTACK_ABILITIES,
  ATTACK_BONUS_MAX,
  ATTACK_BONUS_MIN,
  ATTACK_KINDS,
  SAVE_DC_ABILITIES,
  SAVE_DC_MAX,
  SAVE_DC_MIN,
  AROUND_FEET_MAX,
  STEP_TIMES_MAX,
  MISS_DAMAGES,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  type AbilityCheck,
  type AbilityStep,
  type AttackKind,
  type HitOutcome,
  type MissDamage,
  type MissOutcome,
  type StepTargetKind,
  type StepWhen,
} from './abilitySteps.js';
import {
  nextLink,
  stepTargets,
  stepWhens,
  type StepLink,
} from './abilityStepLinks.js';
import { isArea } from './abilityStepAreasCheck.js';
import { isDamageParts, isStepGrowth } from './abilityStepDamageCheck.js';
import { isFeet, isIntIn, isObject, keysAre } from './abilityStepGuards.js';
import { ABILITY_SCORES, type AbilityScore } from './character.js';

// Строгая проверка шагов «Применения» — для запроса. Из базы шаги читаются мягче, с
// умолчаниями (abilityStepsRead.ts).

export { isFeet } from './abilityStepGuards.js';

function isAbilityOrFixed(
  value: unknown,
  abilities: readonly string[],
  min: number,
  max: number,
): boolean {
  if (!isObject(value)) return false;
  if (value.kind === 'ability') {
    return (
      keysAre(value, 'ability,kind') &&
      abilities.includes(value.ability as string)
    );
  }
  return (
    value.kind === 'fixed' &&
    keysAre(value, 'kind,value') &&
    isIntIn(value.value, min, max)
  );
}

function isCheck(value: unknown): value is AbilityCheck {
  if (!isObject(value)) return false;
  switch (value.kind) {
    case 'attack':
      return (
        keysAre(value, 'attack,bonus,kind') &&
        ATTACK_KINDS.includes(value.attack as AttackKind) &&
        isAbilityOrFixed(
          value.bonus,
          ATTACK_ABILITIES,
          ATTACK_BONUS_MIN,
          ATTACK_BONUS_MAX,
        )
      );
    case 'save':
      return (
        keysAre(value, 'ability,dc,kind') &&
        ABILITY_SCORES.includes(value.ability as AbilityScore) &&
        isAbilityOrFixed(value.dc, SAVE_DC_ABILITIES, SAVE_DC_MIN, SAVE_DC_MAX)
      );
    case 'none':
      return keysAre(value, 'kind');
    default:
      return false;
  }
}

// Цель должна подходить проверке и прошлому шагу (stepTargets); дальняя дистанция —
// только у дальнобойного оружия и дальше обычной.
function isTarget(
  value: unknown,
  check: AbilityCheck,
  link: StepLink | null,
): boolean {
  if (!isObject(value)) return false;
  if (!stepTargets(check, link).includes(value.kind as StepTargetKind))
    return false;
  switch (value.kind) {
    case 'around':
      return keysAre(value, 'feet,kind') && isFeet(value.feet, AROUND_FEET_MAX);
    case 'previous':
    case 'self':
    case 'touch':
      return keysAre(value, 'kind');
    case 'reach':
      return keysAre(value, 'feet,kind') && isFeet(value.feet, REACH_FEET_MAX);
    case 'range':
      return (
        keysAre(value, 'feet,kind,longFeet') &&
        isFeet(value.feet, RANGE_FEET_MAX) &&
        (value.longFeet === null ||
          (check.kind === 'attack' &&
            check.attack === 'ranged_weapon' &&
            isFeet(value.longFeet, RANGE_FEET_MAX) &&
            (value.longFeet as number) > (value.feet as number)))
      );
    case 'area':
      return (
        keysAre(value, 'area,kind,origin') && isArea(value.area, value.origin)
      );
    default:
      return false;
  }
}

function isHit(value: unknown, check: AbilityCheck): value is HitOutcome {
  return (
    isObject(value) &&
    keysAre(value, 'addModifier,damage') &&
    isDamageParts(value.damage) &&
    typeof value.addModifier === 'boolean' &&
    (!value.addModifier ||
      (check.kind === 'attack' && check.bonus.kind === 'ability'))
  );
}

function isMiss(
  value: unknown,
  hit: HitOutcome,
  check: AbilityCheck,
): value is MissOutcome {
  return (
    isObject(value) &&
    keysAre(value, 'damage') &&
    MISS_DAMAGES.includes(value.damage as MissDamage) &&
    // Половина от ничего — ошибка в форме, а не замысел; без проверки промаха нет.
    (value.damage === 'none' ||
      (hit.damage.length > 0 && check.kind !== 'none'))
  );
}

// link — что оставил прошлый шаг (abilityStepLinks.ts), у первого null.
export function isAbilityStep(
  value: unknown,
  link: StepLink | null = null,
): value is AbilityStep {
  if (!isObject(value)) return false;
  if (!keysAre(value, 'check,growth,hit,miss,target,times,when')) return false;
  const { check } = value;
  return (
    stepWhens(link).includes(value.when as StepWhen) &&
    isIntIn(value.times, 1, STEP_TIMES_MAX) &&
    isCheck(check) &&
    isTarget(value.target, check, link) &&
    isHit(value.hit, check) &&
    isMiss(value.miss, value.hit, check) &&
    isStepGrowth(value.growth)
  );
}

// Шаги проверяются цепочкой: каждый — против того, что оставил прошлый.
export function isAbilitySteps(value: unknown): value is AbilityStep[] {
  if (!Array.isArray(value) || value.length > ABILITY_STEPS_MAX) return false;
  let link: StepLink | null = null;
  for (const step of value) {
    if (!isAbilityStep(step, link)) return false;
    link = nextLink(step, link);
  }
  return true;
}
