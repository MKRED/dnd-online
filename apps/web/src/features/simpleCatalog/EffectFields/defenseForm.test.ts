import { describe, expect, it } from 'vitest';
import { effectValidate, fromEffectValues, newComponent } from './effectForm';
import type { DefenseValues } from './defenseForm';

const defense = (over: Partial<DefenseValues>) => {
  const component = newComponent('defense');
  return { ...component, defense: { ...component.defense, ...over } };
};
const formOf = (components: ReturnType<typeof defense>[]) => ({
  effect: {
    components,
    saveEnds: { on: false, ability: null, edge: 'end' as const },
  },
});
const rule = effectValidate.components.defense.damageTypes;
const at = (index: number) => `effect.components.${index}.defense.damageTypes`;

describe('defenseForm', () => {
  it('состояния уходят только с иммунитетом', () => {
    const conditions = ['charmed'] as DefenseValues['conditions'];
    const form = formOf([
      defense({ damageTypes: ['fire'], conditions }),
      defense({ level: 'immunity', damageTypes: [], conditions }),
    ]);
    expect(fromEffectValues(form.effect).components).toEqual([
      {
        kind: 'defense',
        level: 'resistance',
        damageTypes: ['fire'],
        conditions: [],
      },
      {
        kind: 'defense',
        level: 'immunity',
        damageTypes: [],
        conditions: ['charmed'],
      },
    ]);
  });

  it('пустая защита — ошибка, у иммунитета хватает состояния', () => {
    const form = formOf([
      defense({}),
      defense({ level: 'immunity' }),
      defense({ level: 'immunity', conditions: ['frightened'] }),
    ]);
    expect(rule([], form, at(0))).toBe('Выберите хотя бы один тип урона');
    expect(rule([], form, at(1))).toBe('Выберите тип урона или состояние');
    expect(rule([], form, at(2))).toBeNull();
  });

  it('повтор на том же уровне — у второй карточки, на другом уровне — можно', () => {
    const form = formOf([
      defense({ damageTypes: ['fire', 'cold'] }),
      defense({ damageTypes: ['fire'] }),
      defense({ level: 'vulnerability', damageTypes: ['fire'] }),
    ]);
    expect(rule([], form, at(0))).toBeNull();
    expect(rule([], form, at(1))).toBe(
      '«Огонь» уже есть в другой карточке «Сопротивление»',
    );
    expect(rule([], form, at(2))).toBeNull();
  });
});
