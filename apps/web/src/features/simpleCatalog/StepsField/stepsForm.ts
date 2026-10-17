import { randomId } from '@mantine/hooks';
import {
  ATTACK_DEFAULTS,
  stepTargets,
  type AbilityCheck,
  type AbilityCheckKind,
  type AbilityScore,
  type AbilityStep,
  type AttackAbility,
  type AttackKind,
  type DamageDie,
  type DamagePart,
  type DamageType,
  type MissDamage,
  type SaveDcAbility,
} from 'shared';
import {
  fromTargetValues,
  TARGET_BLANK,
  toTargetValues,
  type TargetValues,
} from './stepTargetForm';

// Шаги «Применения» в форме способности (shared/abilitySteps.ts) — плоско, с полями всех
// проверок, целей и бонусов сразу: при переключении введённое не пропадает. key — только
// для React. Числа — '' пока поле пустое (так отдаёт NumberInput), кость — строка (так
// отдаёт Select).
export interface DamageValues {
  key: string;
  count: number | string;
  die: string;
  number: number | string;
  type: DamageType;
}

export interface StepValues extends TargetValues {
  key: string;
  check: AbilityCheckKind;
  attack: AttackKind;
  bonusKind: 'ability' | 'fixed';
  bonusAbility: AttackAbility;
  bonusValue: number | string;
  saveAbility: AbilityScore;
  dcKind: 'ability' | 'fixed';
  dcAbility: SaveDcAbility;
  dcValue: number | string;
  damage: DamageValues[];
  addModifier: boolean;
  onMiss: MissDamage;
}

export const newDamage = (type: DamageType = 'fire'): DamageValues => ({
  key: randomId(),
  count: 1,
  die: '6',
  number: 0,
  type,
});

// Чаще всего это заклинание вроде «Огненного снаряда».
export function newStep(): StepValues {
  return {
    key: randomId(),
    check: 'attack',
    attack: 'ranged_spell',
    target: 'range',
    ...TARGET_BLANK,
    bonusKind: 'ability',
    bonusAbility: 'spellcasting',
    bonusValue: 5,
    saveAbility: 'dexterity',
    dcKind: 'ability',
    dcAbility: 'spellcasting',
    dcValue: 13,
    damage: [{ ...newDamage(), die: '10' }],
    addModifier: false,
    onMiss: 'none',
  };
}

// Проверка из полей формы — без чисел, их проверяет stepsValidate.
export function checkOf(values: StepValues): AbilityCheck {
  switch (values.check) {
    case 'attack':
      return {
        kind: 'attack',
        attack: values.attack,
        bonus:
          values.bonusKind === 'ability'
            ? { kind: 'ability', ability: values.bonusAbility }
            : { kind: 'fixed', value: Number(values.bonusValue) },
      };
    case 'save':
      return {
        kind: 'save',
        ability: values.saveAbility,
        dc:
          values.dcKind === 'ability'
            ? { kind: 'ability', ability: values.dcAbility }
            : { kind: 'fixed', value: Number(values.dcValue) },
      };
    case 'none':
      return { kind: 'none' };
  }
}

// Цель остаётся, если подходит новой проверке, иначе — первая подходящая.
const keepTarget = (step: StepValues) => {
  const allowed = stepTargets(checkOf(step));
  return allowed.includes(step.target) ? step : { ...step, target: allowed[0] };
};

// Другой вид атаки — его цель, характеристика и модификатор к урону по умолчанию.
// Цель остаётся, если подходит: «Касание» не сбросится при переходе к атаке оружием.
export function withAttack(step: StepValues, attack: AttackKind): StepValues {
  const defaults = ATTACK_DEFAULTS[attack];
  const next = keepTarget({ ...step, attack });
  return {
    ...next,
    target: next.target === step.target ? step.target : defaults.target,
    bonusAbility: defaults.ability,
    addModifier: defaults.addModifier,
  };
}

// Другая проверка: у атаки — её значения по умолчанию, у остальных цель сохраняется,
// если подходит; модификатор к урону бывает только у атаки.
export function withCheck(
  step: StepValues,
  check: AbilityCheckKind,
): StepValues {
  if (check === 'attack') return withAttack({ ...step, check }, step.attack);
  return keepTarget({ ...step, check, addModifier: false });
}

export function toStepValues(step: AbilityStep): StepValues {
  const values: StepValues = {
    ...newStep(),
    ...toTargetValues(step.target),
    check: step.check.kind,
    damage: step.hit.damage.map((part) => ({
      ...part,
      key: randomId(),
      die: String(part.die),
    })),
    addModifier: step.hit.addModifier,
    onMiss: step.miss.damage,
  };
  const { check } = step;
  if (check.kind === 'attack') {
    values.attack = check.attack;
    values.bonusKind = check.bonus.kind;
    if (check.bonus.kind === 'ability')
      values.bonusAbility = check.bonus.ability;
    else values.bonusValue = check.bonus.value;
  }
  if (check.kind === 'save') {
    values.saveAbility = check.ability;
    values.dcKind = check.dc.kind;
    if (check.dc.kind === 'ability') values.dcAbility = check.dc.ability;
    else values.dcValue = check.dc.value;
  }
  return values;
}

const fromDamage = (values: DamageValues): DamagePart => ({
  count: Number(values.count),
  die: Number(values.die) as DamageDie,
  number: Number(values.number),
  type: values.type,
});

// Модификатор к урону — только у атаки с бонусом от характеристики, половина — только от
// урона и при проверке: иначе сервер откажет (abilityStepsCheck.ts).
export function fromStepValues(values: StepValues): AbilityStep {
  const check = checkOf(values);
  const modifier = check.kind === 'attack' && check.bonus.kind === 'ability';
  return {
    target: fromTargetValues(
      values,
      check.kind === 'attack' ? check.attack : null,
    ),
    check,
    hit: {
      damage: values.damage.map(fromDamage),
      addModifier: modifier && values.addModifier,
    },
    miss: {
      damage:
        values.damage.length > 0 && check.kind !== 'none'
          ? values.onMiss
          : 'none',
    },
  };
}
