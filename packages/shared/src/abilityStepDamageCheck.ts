import {
  DAMAGE_DICE_MAX,
  DAMAGE_NUMBER_MAX,
  DAMAGE_PARTS_MAX,
  GROWTH_TIMES_MAX,
  type DamagePart,
  type StepGrowth,
} from './abilitySteps.js';
import { isIntIn, isObject, keysAre } from './abilityStepGuards.js';
import {
  DAMAGE_DICE,
  DAMAGE_TYPES,
  type DamageDie,
  type DamageType,
} from './damageTypes.js';

// Строки урона шага и его рост — для строгой проверки запроса (abilityStepsCheck.ts).

export function isDamagePart(value: unknown): value is DamagePart {
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

export const isDamageParts = (value: unknown): value is DamagePart[] =>
  Array.isArray(value) &&
  value.length <= DAMAGE_PARTS_MAX &&
  value.every(isDamagePart);

// С чем растёт, шаг не знает (abilityStepGrowth.ts): рост проверяется без категории и
// затрат, поэтому их правка не делает шаг неверным.
export function isStepGrowth(value: unknown): value is StepGrowth {
  return (
    isObject(value) &&
    keysAre(value, 'damage,times') &&
    isDamageParts(value.damage) &&
    isIntIn(value.times, 0, GROWTH_TIMES_MAX)
  );
}
