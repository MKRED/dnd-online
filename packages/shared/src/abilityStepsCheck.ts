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
  MISS_DAMAGES,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  type AbilityStep,
  type AttackAbility,
  type AttackBonus,
  type AttackKind,
  type DamagePart,
  type HitOutcome,
  type MissDamage,
  type MissOutcome,
} from './abilitySteps.js';
import {
  DAMAGE_DICE,
  DAMAGE_TYPES,
  type DamageDie,
  type DamageType,
} from './damageTypes.js';

// Строгая проверка шагов «Применения» — для запроса. Из базы шаги читаются мягче, с
// умолчаниями (abilityStepsRead.ts).

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

function isHit(value: unknown, bonus: AttackBonus): value is HitOutcome {
  return (
    isObject(value) &&
    keysAre(value, 'addModifier,damage') &&
    Array.isArray(value.damage) &&
    value.damage.length <= DAMAGE_PARTS_MAX &&
    value.damage.every(isDamagePart) &&
    typeof value.addModifier === 'boolean' &&
    (!value.addModifier || bonus.kind === 'ability')
  );
}

function isMiss(value: unknown, hit: HitOutcome): value is MissOutcome {
  return (
    isObject(value) &&
    keysAre(value, 'damage') &&
    MISS_DAMAGES.includes(value.damage as MissDamage) &&
    // Половина от ничего — ошибка в форме, а не замысел.
    (value.damage === 'none' || hit.damage.length > 0)
  );
}

export function isAbilityStep(value: unknown): value is AbilityStep {
  if (!isObject(value)) return false;
  if (!keysAre(value, 'check,hit,miss,target')) return false;
  const { check } = value;
  if (
    !isObject(check) ||
    check.kind !== 'attack' ||
    !keysAre(check, 'attack,bonus,kind') ||
    !ATTACK_KINDS.includes(check.attack as AttackKind) ||
    !isBonus(check.bonus)
  ) {
    return false;
  }
  const bonus = check.bonus as AttackBonus;
  return (
    isTarget(value.target, check.attack as AttackKind) &&
    isHit(value.hit, bonus) &&
    isMiss(value.miss, value.hit)
  );
}

export const isAbilitySteps = (value: unknown): value is AbilityStep[] =>
  Array.isArray(value) &&
  value.length <= ABILITY_STEPS_MAX &&
  value.every(isAbilityStep);
