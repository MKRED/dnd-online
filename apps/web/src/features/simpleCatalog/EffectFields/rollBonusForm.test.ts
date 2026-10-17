import { describe, expect, it } from 'vitest';
import { effectValidate, fromEffectValues, newComponent } from './effectForm';
import { toRollBonusValues, type RollBonusValues } from './rollBonusForm';

const rollBonus = (over: Partial<RollBonusValues>) => {
  const component = newComponent('roll_bonus');
  return { ...component, rollBonus: { ...component.rollBonus, ...over } };
};
const formOf = (components: ReturnType<typeof rollBonus>[]) => ({
  effect: {
    components,
    saveEnds: { on: false, ability: null, edge: 'end' as const },
  },
});
const rules = effectValidate.components.rollBonus;
const at = (index: number, field: string) =>
  `effect.components.${index}.rollBonus.${field}`;

describe('rollBonusForm', () => {
  it('характеристика и тип урона уходят, только где они есть', () => {
    const form = formOf([
      rollBonus({ ability: 'wisdom', damageType: 'fire' }),
      rollBonus({ roll: 'save', ability: 'dexterity', mode: 'penalty' }),
      rollBonus({ roll: 'damage', damageType: 'radiant' }),
      rollBonus({ roll: 'check', mode: 'penalty', damageType: 'fire' }),
    ]);
    const base = { count: 1, die: 4, number: 0 };
    expect(fromEffectValues(form.effect).components).toEqual([
      {
        kind: 'roll_bonus',
        mode: 'bonus',
        roll: 'attack',
        ability: null,
        damageType: null,
        ...base,
      },
      {
        kind: 'roll_bonus',
        mode: 'penalty',
        roll: 'save',
        ability: 'dexterity',
        damageType: null,
        ...base,
      },
      {
        kind: 'roll_bonus',
        mode: 'bonus',
        roll: 'damage',
        ability: null,
        damageType: 'radiant',
        ...base,
      },
      {
        kind: 'roll_bonus',
        mode: 'penalty',
        roll: 'check',
        ability: null,
        damageType: null,
        ...base,
      },
    ]);
  });

  it('читается обратно: «все характеристики» и «того же типа»', () => {
    expect(
      toRollBonusValues({
        mode: 'bonus',
        roll: 'attack',
        ability: null,
        count: 1,
        die: 4,
        number: 0,
        damageType: null,
      }),
    ).toMatchObject({ ability: 'all', die: '4', damageType: 'same' });
  });

  it('пустая прибавка — у костей, повтор бросков — у второй карточки', () => {
    const form = formOf([
      rollBonus({ count: 0, number: 0 }),
      rollBonus({ roll: 'save' }),
      rollBonus({ roll: 'save', mode: 'penalty' }),
      rollBonus({ roll: 'save', ability: 'dexterity' }),
      rollBonus({ count: 11 }),
    ]);
    expect(rules.count(null, form, at(0, 'count'))).toBe(
      'Укажите кости или число',
    );
    expect(rules.count(null, form, at(4, 'count'))).toBe('От 0 до 10');
    expect(rules.roll(null, form, at(1, 'roll'))).toBeNull();
    expect(rules.roll(null, form, at(2, 'roll'))).toBe(
      'Эти броски уже есть в другой карточке',
    );
    expect(rules.roll(null, form, at(3, 'roll'))).toBeNull();
    expect(
      rules.number(21, formOf([rollBonus({ number: 21 })]), at(0, 'number')),
    ).toBe('От 0 до 20');
  });
});
