import { describe, expect, it } from 'vitest';
import { effectValidate, fromEffectValues, newComponent } from './effectForm';
import { toSpeedValues, type SpeedValues } from './speedForm';

const speed = (over: Partial<SpeedValues>) => {
  const component = newComponent('speed');
  return { ...component, speed: { ...component.speed, ...over } };
};
const formOf = (components: ReturnType<typeof speed>[]) => ({
  effect: {
    components,
    saveEnds: { on: false, ability: null, edge: 'end' as const },
  },
});
const rules = effectValidate.components.speed;
const at = (index: number, field: string) =>
  `effect.components.${index}.speed.${field}`;

describe('speedForm', () => {
  it('футы и парение уходят, только где они есть', () => {
    const form = formOf([
      speed({ change: 'double', feet: 10, hover: true }),
      speed({ change: 'fly', feet: 60, hover: true }),
      speed({ change: 'climb', feet: 30, sameAsSpeed: true, hover: true }),
    ]);
    expect(fromEffectValues(form.effect).components).toEqual([
      { kind: 'speed', change: 'double', feet: null, hover: false },
      { kind: 'speed', change: 'fly', feet: 60, hover: true },
      { kind: 'speed', change: 'climb', feet: null, hover: false },
    ]);
  });

  it('«равна Скорости» читается обратно галочкой', () => {
    expect(toSpeedValues({ change: 'swim', feet: null, hover: false })).toEqual(
      { change: 'swim', feet: '', sameAsSpeed: true, hover: false },
    );
    expect(
      toSpeedValues({ change: 'faster', feet: 10, hover: false }).sameAsSpeed,
    ).toBe(false);
  });

  it('футы: пусто и не кратно 5 — ошибка, «равна Скорости» — без чисел', () => {
    const form = formOf([
      speed({}),
      speed({ feet: 12 }),
      speed({ change: 'climb', sameAsSpeed: true }),
      speed({ change: 'zero' }),
    ]);
    expect(rules.feet('', form, at(0, 'feet'))).toBe('Кратно 5, до 300');
    expect(rules.feet(12, form, at(1, 'feet'))).toBe('Кратно 5, до 300');
    expect(rules.feet('', form, at(2, 'feet'))).toBeNull();
    expect(rules.feet('', form, at(3, 'feet'))).toBeNull();
  });

  it('второе изменение Скорости и повтор особой — у второй карточки', () => {
    const form = formOf([
      speed({ feet: 10 }),
      speed({ change: 'fly', feet: 60 }),
      speed({ change: 'half' }),
      speed({ change: 'fly', sameAsSpeed: true }),
      speed({ change: 'climb', sameAsSpeed: true }),
    ]);
    const change = (index: number) =>
      rules.change(null, form, at(index, 'change'));
    expect(change(0)).toBeNull();
    expect(change(1)).toBeNull();
    expect(change(2)).toBe('Изменение Скорости уже есть в эффекте');
    expect(change(3)).toBe('«Скорость полёта» уже есть в эффекте');
    expect(change(4)).toBeNull();
  });
});
