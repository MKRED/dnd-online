import type { AbilityStep } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  fromStepValues,
  newDamage,
  newStep,
  toStepValues,
  withAttack,
  type StepValues,
} from './stepsForm';
import { stepsValidate } from './stepsValidate';

const longbow: AbilityStep = {
  target: { kind: 'range', feet: 150, longFeet: 600 },
  check: {
    kind: 'attack',
    attack: 'ranged_weapon',
    bonus: { kind: 'ability', ability: 'dexterity' },
  },
  damage: [{ count: 1, die: 8, number: 0, type: 'piercing' }],
  addModifier: true,
  onMiss: 'none',
};

const formOf = (step: StepValues) => ({ steps: [step] });

describe('stepsForm', () => {
  it('шаг читается в форму и уходит обратно таким же', () => {
    expect(fromStepValues(toStepValues(longbow))).toEqual(longbow);
  });

  it('скрытые поля не уходят: дальняя у заклинания, модификатор при числе, половина без урона', () => {
    const spell = { ...newStep(), longOn: true };
    expect(fromStepValues(spell).target).toEqual({
      kind: 'range',
      feet: 120,
      longFeet: null,
    });
    const fixed = {
      ...newStep(),
      bonusKind: 'fixed' as const,
      addModifier: true,
    };
    expect(fromStepValues(fixed)).toMatchObject({
      check: { bonus: { kind: 'fixed', value: 5 } },
      addModifier: false,
    });
    const empty = { ...newStep(), damage: [], onMiss: 'half' as const };
    expect(fromStepValues(empty).onMiss).toBe('none');
  });

  it('смена вида атаки подставляет цель и характеристику', () => {
    const sword = withAttack(newStep(), 'melee_weapon');
    expect(sword).toMatchObject({
      target: 'reach',
      bonusAbility: 'strength',
      addModifier: true,
    });
    // Касание подходит и атаке оружием — остаётся.
    const touch = {
      ...withAttack(newStep(), 'melee_spell'),
      target: 'touch' as const,
    };
    expect(withAttack(touch, 'melee_weapon').target).toBe('touch');
  });

  it('проверки: футы, дальняя дальше обычной, пустой урон', () => {
    const bow = { ...toStepValues(longbow), longFeet: 100 };
    expect(stepsValidate.rangeFeet(152, formOf(bow), 'steps.0.rangeFeet')).toBe(
      'Кратно 5, от 5 до 5280',
    );
    expect(stepsValidate.longFeet(100, formOf(bow), 'steps.0.longFeet')).toBe(
      'Дальше обычной',
    );
    // Досягаемость не проверяется, пока цель — дистанция.
    expect(
      stepsValidate.reachFeet('', formOf(bow), 'steps.0.reachFeet'),
    ).toBeNull();
    const blank = {
      ...newStep(),
      damage: [{ ...newDamage(), count: 0, number: 0 }],
    };
    expect(
      stepsValidate.damage.count(0, formOf(blank), 'steps.0.damage.0.count'),
    ).toBe('Укажите кости или число');
    expect(
      stepsValidate.bonusValue(40, formOf(blank), 'steps.0.bonusValue'),
    ).toBeNull();
    const fixed = { ...blank, bonusKind: 'fixed' as const };
    expect(
      stepsValidate.bonusValue(40, formOf(fixed), 'steps.0.bonusValue'),
    ).toBe('От -5 до 30');
  });
});
