import { randomId } from '@mantine/hooks';
import {
  ATTACK_DEFAULTS,
  stepTargets,
  type StepLink,
  type StepWhen,
  type AbilityCheck,
  type AbilityCheckKind,
  type AbilityScore,
  type AbilityStep,
  type AttackAbility,
  type AttackKind,
  type MissDamage,
  type SaveDcAbility,
} from 'shared';
import {
  fromDamageValues,
  fromGrowthValues,
  GROWTH_BLANK,
  newDamage,
  toDamageValues,
  toGrowthValues,
  type DamageValues,
  type GrowthValues,
} from './damageForm';
import {
  fromTargetValues,
  TARGET_BLANK,
  toTargetValues,
  type TargetValues,
} from './stepTargetForm';

export { newDamage, type DamageValues };

// Шаги «Применения» в форме способности (shared/abilitySteps.ts) — плоско, с полями всех
// проверок, целей и бонусов сразу: при переключении введённое не пропадает. key — только
// для React. Числа — '' пока поле пустое (так отдаёт NumberInput). Урон и рост —
// damageForm.ts.
export interface StepValues extends TargetValues, GrowthValues {
  key: string;
  when: StepWhen;
  times: number | string;
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

// Чаще всего это заклинание вроде «Огненного снаряда». Цель шага 2 и дальше подберёт
// цепочка (stepChain.ts): обычно та же, что у прошлого.
export function newStep(): StepValues {
  return {
    key: randomId(),
    when: 'always',
    times: 1,
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
    ...GROWTH_BLANK,
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

// Цель остаётся, если подходит новой проверке и прошлому шагу (link), иначе — первая
// подходящая.
export const keepTarget = (step: StepValues, link: StepLink | null) => {
  const allowed = stepTargets(checkOf(step), link);
  return allowed.includes(step.target) ? step : { ...step, target: allowed[0] };
};

// Другой вид атаки — его цель, характеристика и модификатор к урону по умолчанию.
// Цель остаётся, если подходит: «Касание» не сбросится при переходе к атаке оружием,
// «Та же цель» — тоже.
export function withAttack(
  step: StepValues,
  attack: AttackKind,
  link: StepLink | null,
): StepValues {
  const defaults = ATTACK_DEFAULTS[attack];
  const next = keepTarget({ ...step, attack }, link);
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
  link: StepLink | null,
): StepValues {
  if (check === 'attack')
    return withAttack({ ...step, check }, step.attack, link);
  return keepTarget({ ...step, check, addModifier: false }, link);
}

export function toStepValues(step: AbilityStep): StepValues {
  const values: StepValues = {
    ...newStep(),
    ...toTargetValues(step.target),
    when: step.when,
    times: step.times,
    check: step.check.kind,
    damage: step.hit.damage.map(toDamageValues),
    addModifier: step.hit.addModifier,
    onMiss: step.miss.damage,
    ...toGrowthValues(step.growth),
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

// Модификатор к урону — только у атаки с бонусом от характеристики, половина — только от
// урона и при проверке: иначе сервер откажет (abilityStepsCheck.ts). «Когда» и цель
// против прошлого шага сверяет цепочка (chainSteps) до этого.
export function fromStepValues(values: StepValues): AbilityStep {
  const check = checkOf(values);
  const modifier = check.kind === 'attack' && check.bonus.kind === 'ability';
  return {
    when: values.when,
    times: Number(values.times),
    target: fromTargetValues(
      values,
      check.kind === 'attack' ? check.attack : null,
    ),
    check,
    hit: {
      damage: values.damage.map(fromDamageValues),
      addModifier: modifier && values.addModifier,
    },
    miss: {
      damage:
        values.damage.length > 0 && check.kind !== 'none'
          ? values.onMiss
          : 'none',
    },
    growth: fromGrowthValues(values),
  };
}
