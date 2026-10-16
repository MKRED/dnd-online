import { describe, expect, it } from 'vitest';
import { toAutoFailValues, type AutoFailValues } from './autoFailForm';
import { effectValidate, fromEffectValues, newComponent } from './effectForm';

const autoFail = (over: Partial<AutoFailValues>) => {
  const component = newComponent('auto_fail');
  return { ...component, autoFail: { ...component.autoFail, ...over } };
};
const formOf = (components: ReturnType<typeof autoFail>[]) => ({
  effect: {
    components,
    saveEnds: { on: false, ability: null, edge: 'end' as const },
  },
});
const rule = effectValidate.components.autoFail.roll;
const at = (index: number) => `effect.components.${index}.autoFail.roll`;

describe('autoFailForm', () => {
  it('характеристика уходит только у спасбросков', () => {
    const form = formOf([
      autoFail({ ability: 'strength' }),
      autoFail({ roll: 'sight_check', ability: 'dexterity' }),
      autoFail({}),
    ]);
    expect(fromEffectValues(form.effect).components).toEqual([
      { kind: 'auto_fail', roll: 'save', ability: 'strength' },
      { kind: 'auto_fail', roll: 'sight_check', ability: null },
      { kind: 'auto_fail', roll: 'save', ability: null },
    ]);
  });

  it('«все характеристики» читается обратно', () => {
    expect(toAutoFailValues({ roll: 'save', ability: null })).toEqual({
      roll: 'save',
      ability: 'all',
    });
  });

  it('те же броски — ошибка у второй карточки', () => {
    const form = formOf([
      autoFail({ ability: 'strength' }),
      autoFail({ ability: 'dexterity' }),
      autoFail({ ability: 'strength' }),
    ]);
    expect(rule(null, form, at(0))).toBeNull();
    expect(rule(null, form, at(1))).toBeNull();
    expect(rule(null, form, at(2))).toBe(
      'Эти броски уже есть в другой карточке',
    );
  });
});
