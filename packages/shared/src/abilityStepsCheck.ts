import {
  ABILITY_STEPS_MAX,
  ATTACK_ABILITIES,
  ATTACK_BONUS_MAX,
  ATTACK_BONUS_MIN,
  ATTACK_KINDS,
  SAVE_DC_ABILITIES,
  SAVE_DC_MAX,
  SAVE_DC_MIN,
  stepTargets,
  DAMAGE_DICE_MAX,
  DAMAGE_NUMBER_MAX,
  DAMAGE_PARTS_MAX,
  MISS_DAMAGES,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  type AbilityCheck,
  type AbilityStep,
  type AttackKind,
  type DamagePart,
  type HitOutcome,
  type MissDamage,
  type MissOutcome,
  type StepTargetKind,
} from './abilitySteps.js';
import { isArea } from './abilityStepAreasCheck.js';
import { isFeet, isIntIn, isObject, keysAre } from './abilityStepGuards.js';
import { ABILITY_SCORES, type AbilityScore } from './character.js';
import {
  DAMAGE_DICE,
  DAMAGE_TYPES,
  type DamageDie,
  type DamageType,
} from './damageTypes.js';

// Строгая проверка шагов «Применения» — для запроса. Из базы шаги читаются мягче, с
// умолчаниями (abilityStepsRead.ts).

export { isFeet } from './abilityStepGuards.js';

function isDamagePart(value: unknown): value is DamagePart {
  return (
    isObject(value) &&
    keysAre(value, 'count,die,number,type') &&
    isIntIn(value.count, 0, DAMAGE_DICE_MAX) &&
    DAMAGE_DICE.includes(value.die as DamageDie) &&
    isIntIn(value.number, 0, DAMAGE_NUMBER_MAX) &&
    // Пустая строка урона ничего не значит.
    ((value.count as number) > 0 || (value.number as number) > 0) &&
    DAMAGE_TYPES.includes(value.type as DamageType)
  );
}

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

// Цель должна подходить проверке (stepTargets); дальняя дистанция — только у
// дальнобойного оружия и дальше обычной.
function isTarget(value: unknown, check: AbilityCheck): boolean {
  if (!isObject(value)) return false;
  if (!stepTargets(check).includes(value.kind as StepTargetKind)) return false;
  switch (value.kind) {
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
    Array.isArray(value.damage) &&
    value.damage.length <= DAMAGE_PARTS_MAX &&
    value.damage.every(isDamagePart) &&
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

export function isAbilityStep(value: unknown): value is AbilityStep {
  if (!isObject(value)) return false;
  if (!keysAre(value, 'check,hit,miss,target')) return false;
  const { check } = value;
  return (
    isCheck(check) &&
    isTarget(value.target, check) &&
    isHit(value.hit, check) &&
    isMiss(value.miss, value.hit, check)
  );
}

export const isAbilitySteps = (value: unknown): value is AbilityStep[] =>
  Array.isArray(value) &&
  value.length <= ABILITY_STEPS_MAX &&
  value.every(isAbilityStep);
