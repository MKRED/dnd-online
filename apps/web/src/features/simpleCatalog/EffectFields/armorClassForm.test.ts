import { describe, expect, it } from 'vitest';
import type { ArmorClassValues } from './armorClassForm';
import { effectValidate, fromEffectValues, newComponent } from './effectForm';

const armorClass = (over: Partial<ArmorClassValues>) => {
  const component = newComponent('armor_class');
  return { ...component, armorClass: { ...component.armorClass, ...over } };
};
const formOf = (components: ReturnType<typeof armorClass>[]) => ({
  effect: {
    components,
    saveEnds: { on: false, ability: null, edge: 'end' as const },
  },
});
const rules = effectValidate.components.armorClass;
const at = (index: number, field: string) =>
  `effect.components.${index}.armorClass.${field}`;

describe('armorClassForm', () => {
  it('уходит изменение и число', () => {
    const form = formOf([
      armorClass({ value: 2 }),
      armorClass({ change: 'base', value: 13 }),
    ]);
    expect(fromEffectValues(form.effect).components).toEqual([
      { kind: 'armor_class', change: 'bonus', value: 2 },
      { kind: 'armor_class', change: 'base', value: 13 },
    ]);
  });

  it('число: пусто и вне пределов своего изменения — ошибка', () => {
    const form = formOf([
      armorClass({}),
      armorClass({ value: 11 }),
      armorClass({ change: 'minimum', value: 5 }),
      armorClass({ change: 'minimum', value: 17 }),
    ]);
    expect(rules.value('', form, at(0, 'value'))).toBe('От 1 до 10');
    expect(rules.value(11, form, at(1, 'value'))).toBe('От 1 до 10');
    expect(rules.value(5, form, at(2, 'value'))).toBe('От 10 до 30');
    expect(rules.value(17, form, at(3, 'value'))).toBeNull();
  });

  it('второй сдвиг КД и повтор «не ниже» — у второй карточки', () => {
    const form = formOf([
      armorClass({ value: 2 }),
      armorClass({ change: 'minimum', value: 17 }),
      armorClass({ change: 'penalty', value: 2 }),
      armorClass({ change: 'minimum', value: 15 }),
      armorClass({ change: 'base', value: 13 }),
    ]);
    const change = (i: number) => rules.change(null, form, at(i, 'change'));
    expect(change(0)).toBeNull();
    expect(change(1)).toBeNull();
    expect(change(2)).toBe('Изменение КД на N уже есть в эффекте');
    expect(change(3)).toBe('«Не ниже N» уже есть в эффекте');
    expect(change(4)).toBeNull();
  });
});
