import type { AbilityFields } from 'shared';
import { describe, expect, it } from 'vitest';
import { fromUsageValues, toUsageValues, usageValidate } from './usageForm';

const full: AbilityFields = {
  activation: { kind: 'reaction', trigger: 'когда вас бьют' },
  costs: {
    uses: { count: { kind: 'ability', ability: 'wisdom' }, recovery: 'short' },
    spellSlot: { minLevel: 2 },
    movement: { kind: 'feet', feet: 15 },
    hitDie: true,
  },
};

describe('usageForm', () => {
  it('новая способность — действие без затрат', () => {
    expect(fromUsageValues(toUsageValues())).toEqual({
      activation: { kind: 'action' },
      costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
    });
  });

  it('туда и обратно сохраняет всё', () => {
    expect(fromUsageValues(toUsageValues(full))).toEqual(full);
  });

  it('снятая галочка не отправляет поля, но и не стирает их в форме', () => {
    const values = { ...toUsageValues(full), slotOn: false, usesOn: false };
    expect(fromUsageValues(values).costs).toMatchObject({
      uses: null,
      spellSlot: null,
    });
    expect(values.slotLevel).toBe(2);
  });

  it('чистит условие и не отправляет его у действия', () => {
    const values = { ...toUsageValues(full), trigger: '  когда бьют  ' };
    expect(fromUsageValues(values).activation).toEqual({
      kind: 'reaction',
      trigger: 'когда бьют',
    });
    expect(fromUsageValues({ ...values, kind: 'action' }).activation).toEqual({
      kind: 'action',
    });
  });

  it('проверяет числа, только когда поле в деле', () => {
    const usage = toUsageValues(full);
    expect(usageValidate.slotLevel(10, { usage })).toBe('От 1 до 9');
    expect(
      usageValidate.slotLevel(10, { usage: { ...usage, slotOn: false } }),
    ).toBeNull();
    expect(
      usageValidate.usesAmount('', {
        usage: { ...usage, usesCount: 'fixed' },
      }),
    ).toBe('От 1 до 99');
    expect(usageValidate.movementFeet(12, { usage })).toBe(
      'От 5 до 120, кратно 5',
    );
    expect(
      usageValidate.movementFeet('', { usage: { ...usage, movement: 'all' } }),
    ).toBeNull();
    expect(usageValidate.amount('', { usage })).toBeNull();
    expect(
      usageValidate.amount('', { usage: { ...usage, kind: 'time' } }),
    ).not.toBeNull();
  });
});
