import {
  AREA_FEET_MAX,
  ATTACK_BONUS_MAX,
  ATTACK_BONUS_MIN,
  DAMAGE_DICE_MAX,
  DAMAGE_NUMBER_MAX,
  RANGE_FEET_MAX,
  REACH_FEET_MAX,
  SAVE_DC_MAX,
  SAVE_DC_MIN,
  isFeet,
} from 'shared';
import type { StepValues } from './stepsForm';
import { isPointOrigin } from './stepTargetForm';

// Те же правила, что у сервера (abilityStepsCheck.ts), с текстом у своего поля. Mantine
// зовёт правило списка с путём вроде «steps.0.damage.1.count»: шаг и строку урона
// находим по нему. Поле скрытой цели или бонуса не проверяется — оно не уходит.

interface WithSteps {
  steps: StepValues[];
}

const indexes = (path: string) =>
  path
    .split('.')
    .filter((part) => /^\d+$/.test(part))
    .map(Number);
const stepOf = (form: WithSteps, path: string) => form.steps[indexes(path)[0]];
const damageOf = (form: WithSteps, path: string) => {
  const [step, part] = indexes(path);
  return form.steps[step].damage[part];
};

const intIn = (value: number | string, min: number, max: number) => {
  const n = Number(value);
  return value !== '' && Number.isInteger(n) && n >= min && n <= max;
};
const feetError = (max: number) => `Кратно 5, от 5 до ${max}`;
// Размер области проверяется, только если поле видно.
const areaFeet = (value: number | string, shown: boolean) =>
  !shown || isFeet(Number(value), AREA_FEET_MAX)
    ? null
    : feetError(AREA_FEET_MAX);

export const stepsValidate = {
  reachFeet: (value: number | string, form: WithSteps, path: string) =>
    stepOf(form, path).target !== 'reach' ||
    isFeet(Number(value), REACH_FEET_MAX)
      ? null
      : feetError(REACH_FEET_MAX),
  rangeFeet: (value: number | string, form: WithSteps, path: string) =>
    stepOf(form, path).target !== 'range' ||
    isFeet(Number(value), RANGE_FEET_MAX)
      ? null
      : feetError(RANGE_FEET_MAX),
  longFeet: (value: number | string, form: WithSteps, path: string) => {
    const step = stepOf(form, path);
    if (!step.longOn || step.check !== 'attack') return null;
    if (step.attack !== 'ranged_weapon') return null;
    if (!isFeet(Number(value), RANGE_FEET_MAX))
      return feetError(RANGE_FEET_MAX);
    return Number(value) > Number(step.rangeFeet) ? null : 'Дальше обычной';
  },
  bonusValue: (value: number | string, form: WithSteps, path: string) =>
    stepOf(form, path).check !== 'attack' ||
    stepOf(form, path).bonusKind !== 'fixed' ||
    intIn(value, ATTACK_BONUS_MIN, ATTACK_BONUS_MAX)
      ? null
      : `От ${ATTACK_BONUS_MIN} до ${ATTACK_BONUS_MAX}`,
  dcValue: (value: number | string, form: WithSteps, path: string) =>
    stepOf(form, path).check !== 'save' ||
    stepOf(form, path).dcKind !== 'fixed' ||
    intIn(value, SAVE_DC_MIN, SAVE_DC_MAX)
      ? null
      : `От ${SAVE_DC_MIN} до ${SAVE_DC_MAX}`,
  areaSize: (value: number | string, form: WithSteps, path: string) =>
    areaFeet(value, stepOf(form, path).target === 'area'),
  areaHeight: (value: number | string, form: WithSteps, path: string) => {
    const step = stepOf(form, path);
    return areaFeet(
      value,
      step.target === 'area' && step.areaShape === 'cylinder',
    );
  },
  areaWidth: (value: number | string, form: WithSteps, path: string) => {
    const step = stepOf(form, path);
    return areaFeet(value, step.target === 'area' && step.areaShape === 'line');
  },
  originFeet: (value: number | string, form: WithSteps, path: string) => {
    const step = stepOf(form, path);
    return step.target !== 'area' ||
      !isPointOrigin(step) ||
      isFeet(Number(value), RANGE_FEET_MAX)
      ? null
      : feetError(RANGE_FEET_MAX);
  },
  damage: {
    count: (value: number | string, form: WithSteps, path: string) => {
      if (!intIn(value, 0, DAMAGE_DICE_MAX))
        return `От 0 до ${DAMAGE_DICE_MAX}`;
      return Number(value) === 0 && Number(damageOf(form, path).number) === 0
        ? 'Укажите кости или число'
        : null;
    },
    number: (value: number | string) =>
      intIn(value, 0, DAMAGE_NUMBER_MAX)
        ? null
        : `От 0 до ${DAMAGE_NUMBER_MAX}`,
  },
};
