import { randomId } from '@mantine/hooks';
import {
  ATTACK_DEFAULTS,
  type AbilityStep,
  type AttackAbility,
  type AttackKind,
  type DamageDie,
  type DamagePart,
  type DamageType,
  type MissOutcome,
  type StepTarget,
  type StepTargetKind,
} from 'shared';

// Шаги «Применения» в форме способности (shared/abilitySteps.ts) — плоско, с полями всех
// целей и бонусов сразу: при переключении введённое не пропадает. key — только для React.
// Числа — '' пока поле пустое (так отдаёт NumberInput), кость — строка (так отдаёт Select).
export interface DamageValues {
  key: string;
  count: number | string;
  die: string;
  number: number | string;
  type: DamageType;
}

export interface StepValues {
  key: string;
  attack: AttackKind;
  target: StepTargetKind;
  reachFeet: number | string;
  rangeFeet: number | string;
  longOn: boolean;
  longFeet: number | string;
  bonusKind: 'ability' | 'fixed';
  bonusAbility: AttackAbility;
  bonusValue: number | string;
  damage: DamageValues[];
  addModifier: boolean;
  onMiss: MissOutcome;
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
    attack: 'ranged_spell',
    target: 'range',
    reachFeet: 5,
    rangeFeet: 120,
    longOn: false,
    longFeet: 600,
    bonusKind: 'ability',
    bonusAbility: 'spellcasting',
    bonusValue: 5,
    damage: [{ ...newDamage(), die: '10' }],
    addModifier: false,
    onMiss: 'none',
  };
}

// Другой вид атаки — цель, характеристика и модификатор к урону по умолчанию для него.
// Цель остаётся, если подходит: «Касание» не сбросится при переходе к атаке оружием.
export function withAttack(step: StepValues, attack: AttackKind): StepValues {
  const defaults = ATTACK_DEFAULTS[attack];
  const melee = (kind: StepTargetKind) => kind !== 'range';
  return {
    ...step,
    attack,
    target:
      melee(step.target) === melee(defaults.target)
        ? step.target
        : defaults.target,
    bonusAbility: defaults.ability,
    addModifier: defaults.addModifier,
  };
}

export function toStepValues(step: AbilityStep): StepValues {
  const values: StepValues = {
    ...newStep(),
    attack: step.check.attack,
    target: step.target.kind,
    damage: step.damage.map((part) => ({
      ...part,
      key: randomId(),
      die: String(part.die),
    })),
    addModifier: step.addModifier,
    onMiss: step.onMiss,
  };
  if (step.target.kind === 'reach') values.reachFeet = step.target.feet;
  if (step.target.kind === 'range') {
    values.rangeFeet = step.target.feet;
    values.longOn = step.target.longFeet !== null;
    if (step.target.longFeet) values.longFeet = step.target.longFeet;
  }
  const { bonus } = step.check;
  values.bonusKind = bonus.kind;
  if (bonus.kind === 'ability') values.bonusAbility = bonus.ability;
  else values.bonusValue = bonus.value;
  return values;
}

function fromTarget(values: StepValues): StepTarget {
  switch (values.target) {
    case 'touch':
      return { kind: 'touch' };
    case 'reach':
      return { kind: 'reach', feet: Number(values.reachFeet) };
    case 'range':
      return {
        kind: 'range',
        feet: Number(values.rangeFeet),
        longFeet:
          values.longOn && values.attack === 'ranged_weapon'
            ? Number(values.longFeet)
            : null,
      };
  }
}

const fromDamage = (values: DamageValues): DamagePart => ({
  count: Number(values.count),
  die: Number(values.die) as DamageDie,
  number: Number(values.number),
  type: values.type,
});

// Модификатор к урону — только при бонусе от характеристики, половина — только от урона:
// иначе сервер откажет (abilityStepsCheck.ts).
export function fromStepValues(values: StepValues): AbilityStep {
  const ability = values.bonusKind === 'ability';
  return {
    target: fromTarget(values),
    check: {
      kind: 'attack',
      attack: values.attack,
      bonus: ability
        ? { kind: 'ability', ability: values.bonusAbility }
        : { kind: 'fixed', value: Number(values.bonusValue) },
    },
    damage: values.damage.map(fromDamage),
    addModifier: ability && values.addModifier,
    onMiss: values.damage.length > 0 ? values.onMiss : 'none',
  };
}
