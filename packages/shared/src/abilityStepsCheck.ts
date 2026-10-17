import {
  ABILITY_STEPS_MAX,
  ATTACK_ABILITIES,
  ATTACK_BONUS_MAX,
  ATTACK_BONUS_MIN,
  ATTACK_KINDS,
  attackTargets,
  DAMAGE_DICE_MAX,
  DAMAGE_NUMBER_MAX,
  DAMAGE_PARTS_MAX,
  FEET_STEP,
  MISS_OUTCOMES,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  type AbilityStep,
  type AttackAbility,
  type AttackKind,
  type DamagePart,
  type MissOutcome,
} from './abilitySteps.js';
import {
  DAMAGE_DICE,
  DAMAGE_TYPES,
  type DamageDie,
  type DamageType,
} from './damageTypes.js';

// Проверка шагов «Применения»: строгая для запроса (isAbilitySteps) и мягкая для чтения
// из базы (readAbilitySteps) — испорченный шаг пропускается, остальные остаются, как у
// составляющих эффекта (effectComponentsRead.ts).

const keysAre = (value: object, keys: string) =>
  Object.keys(value).sort().join(',') === keys;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isIntIn = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;
export const isFeet = (value: unknown, max: number) =>
  isIntIn(value, FEET_STEP, max) && (value as number) % FEET_STEP === 0;

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

function isBonus(value: unknown): boolean {
  if (!isObject(value)) return false;
  if (value.kind === 'ability') {
    return (
      keysAre(value, 'ability,kind') &&
      ATTACK_ABILITIES.includes(value.ability as AttackAbility)
    );
  }
  return (
    value.kind === 'fixed' &&
    keysAre(value, 'kind,value') &&
    isIntIn(value.value, ATTACK_BONUS_MIN, ATTACK_BONUS_MAX)
  );
}

// Цель должна подходить виду атаки: касание и досягаемость — ближней, дистанция —
// дальнобойной; дальняя дистанция — только у оружия и дальше обычной.
function isTarget(value: unknown, attack: AttackKind): boolean {
  if (!isObject(value)) return false;
  if (!attackTargets(attack).includes(value.kind as never)) return false;
  switch (value.kind) {
    case 'touch':
      return keysAre(value, 'kind');
    case 'reach':
      return keysAre(value, 'feet,kind') && isFeet(value.feet, REACH_FEET_MAX);
    case 'range':
      return (
        keysAre(value, 'feet,kind,longFeet') &&
        isFeet(value.feet, RANGE_FEET_MAX) &&
        (value.longFeet === null ||
          (attack === 'ranged_weapon' &&
            isFeet(value.longFeet, RANGE_FEET_MAX) &&
            (value.longFeet as number) > (value.feet as number)))
      );
    default:
      return false;
  }
}

export function isAbilityStep(value: unknown): value is AbilityStep {
  if (!isObject(value)) return false;
  if (!keysAre(value, 'addModifier,check,damage,onMiss,target')) return false;
  const { check, damage, addModifier, onMiss } = value;
  if (
    !isObject(check) ||
    check.kind !== 'attack' ||
    !keysAre(check, 'attack,bonus,kind') ||
    !ATTACK_KINDS.includes(check.attack as AttackKind) ||
    !isBonus(check.bonus)
  ) {
    return false;
  }
  const bonus = check.bonus as AbilityStep['check']['bonus'];
  return (
    isTarget(value.target, check.attack as AttackKind) &&
    Array.isArray(damage) &&
    damage.length <= DAMAGE_PARTS_MAX &&
    damage.every(isDamagePart) &&
    typeof addModifier === 'boolean' &&
    (!addModifier || bonus.kind === 'ability') &&
    MISS_OUTCOMES.includes(onMiss as MissOutcome) &&
    // Половина от ничего — ошибка в форме, а не замысел.
    (onMiss === 'none' || damage.length > 0)
  );
}

export const isAbilitySteps = (value: unknown): value is AbilityStep[] =>
  Array.isArray(value) &&
  value.length <= ABILITY_STEPS_MAX &&
  value.every(isAbilityStep);

export const readAbilitySteps = (value: unknown): AbilityStep[] =>
  Array.isArray(value)
    ? value.filter(isAbilityStep).slice(0, ABILITY_STEPS_MAX)
    : [];
