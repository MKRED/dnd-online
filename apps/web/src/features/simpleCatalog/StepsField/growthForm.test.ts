import type { AbilityStep } from 'shared';
import { describe, expect, it } from 'vitest';
import { formGrowthBasis } from '../abilityInput';
import { toSimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { ABILITIES } from '../simpleCatalogs';
import { fromStepValues, toStepValues, type StepValues } from './stepsForm';
import { stepsValidate } from './stepsValidate';

// Рост шага в форме (этап 7).
const fireball: AbilityStep = {
  when: 'always',
  times: 1,
  target: { kind: 'range', feet: 150, longFeet: null },
  check: {
    kind: 'save',
    ability: 'dexterity',
    dc: { kind: 'ability', ability: 'spellcasting' },
  },
  hit: {
    damage: [{ count: 8, die: 6, number: 0, type: 'fire' }],
    addModifier: false,
    effects: [],
  },
  miss: { damage: 'half', effects: [] },
  growth: {
    damage: [{ count: 1, die: 6, number: 0, type: 'fire' }],
    times: 0,
  },
};
const formOf = (step: StepValues) => ({ steps: [step] });

describe('рост шага в форме', () => {
  it('туда и обратно; убранный рост не уходит', () => {
    const values = toStepValues(fireball);
    expect(values.growthOn).toBe(true);
    expect(fromStepValues(values)).toEqual(fireball);
    expect(fromStepValues({ ...values, growthOn: false }).growth).toEqual({
      damage: [],
      times: 0,
    });
    const plain = toStepValues({
      ...fireball,
      growth: { damage: [], times: 0 },
    });
    expect(plain.growthOn).toBe(false);
  });

  it('проверки — только у открытого роста', () => {
    const values = { ...toStepValues(fireball), growthTimes: 4 };
    const path = 'steps.0.growthTimes';
    expect(stepsValidate.growthTimes(4, formOf(values), path)).toBe(
      'От 0 до 3',
    );
    expect(stepsValidate.growthTimes('', formOf(values), path)).toBe(
      'От 0 до 3',
    );
    const off = { ...values, growthOn: false };
    expect(stepsValidate.growthTimes(4, formOf(off), path)).toBeNull();
    // Строка роста проверяется как строка урона — по своему списку.
    const empty = {
      ...values,
      growthDamage: [{ ...values.growthDamage[0], count: 0, number: 0 }],
    };
    const countPath = 'steps.0.growthDamage.0.count';
    expect(stepsValidate.growthDamage.count(0, formOf(empty), countPath)).toBe(
      'Укажите кости или число',
    );
    expect(
      stepsValidate.growthDamage.count(
        0,
        formOf({ ...empty, growthOn: false }),
        countPath,
      ),
    ).toBeNull();
  });

  it('с чем растёт — по категории, кругу и ячейке в форме', () => {
    const blank = {
      ...toSimpleFormValues(ABILITIES, null),
      category: 'feature',
    };
    expect(formGrowthBasis(blank)).toEqual({ kind: 'level' });
    const slot = { ...blank.usage, slotOn: true, slotLevel: 1 };
    expect(formGrowthBasis({ ...blank, usage: slot })).toEqual({
      kind: 'slot',
      above: 1,
    });
    // У заклинания ячейка — его круга, что бы ни осталось в поле круга ячейки.
    const spell = { ...blank.spell, level: '3' };
    expect(
      formGrowthBasis({ ...blank, category: 'spell', spell, usage: slot }),
    ).toEqual({ kind: 'slot', above: 3 });
    expect(
      formGrowthBasis({
        ...blank,
        category: 'spell',
        spell,
        usage: { ...slot, slotOn: false },
      }),
    ).toEqual({ kind: 'none' });
    expect(
      formGrowthBasis({
        ...blank,
        category: 'spell',
        spell: { ...spell, level: '0' },
        usage: slot,
      }),
    ).toEqual({ kind: 'level' });
  });
});
