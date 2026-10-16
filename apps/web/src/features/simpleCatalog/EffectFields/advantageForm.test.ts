import { describe, expect, it } from 'vitest';
import { toAdvantageValues, type AdvantageValues } from './advantageForm';
import { effectValidate, fromEffectValues, newComponent } from './effectForm';

const advantage = (over: Partial<AdvantageValues>) => {
  const component = newComponent('advantage');
  return { ...component, advantage: { ...component.advantage, ...over } };
};
const formOf = (components: ReturnType<typeof advantage>[]) => ({
  effect: {
    components,
    saveEnds: { on: false, ability: null, edge: 'end' as const },
  },
});
const rule = effectValidate.components.advantage.roll;
const at = (index: number) => `effect.components.${index}.advantage.roll`;

describe('advantageForm', () => {
  it('характеристика уходит только у спасбросков и проверок', () => {
    const form = formOf([
      advantage({ roll: 'attacked', ability: 'strength' }),
      advantage({ roll: 'save', ability: 'dexterity' }),
      advantage({ mode: 'disadvantage', roll: 'check' }),
    ]);
    expect(fromEffectValues(form.effect).components).toEqual([
      {
        kind: 'advantage',
        mode: 'advantage',
        roll: 'attacked',
        ability: null,
        when: null,
      },
      {
        kind: 'advantage',
        mode: 'advantage',
        roll: 'save',
        ability: 'dexterity',
        when: null,
      },
      {
        kind: 'advantage',
        mode: 'disadvantage',
        roll: 'check',
        ability: null,
        when: null,
      },
    ]);
  });

  it('условие уходит, только если оно есть у выбранного броска', () => {
    const form = formOf([
      advantage({ roll: 'attacked', when: 'within_5ft' }),
      advantage({ roll: 'save', when: 'within_5ft' }),
      advantage({ roll: 'initiative', when: 'source_in_sight' }),
    ]);
    expect(
      fromEffectValues(form.effect).components.map(
        (c) => c.kind === 'advantage' && c.when,
      ),
    ).toEqual(['within_5ft', null, null]);
  });

  it('«все характеристики» и «всегда» читаются обратно', () => {
    expect(
      toAdvantageValues({
        mode: 'advantage',
        roll: 'd20',
        ability: null,
        when: null,
      }),
    ).toEqual({
      mode: 'advantage',
      roll: 'd20',
      ability: 'all',
      when: 'always',
    });
  });

  it('те же броски с другим знаком — ошибка у второй карточки', () => {
    const form = formOf([
      advantage({ roll: 'save', ability: 'strength' }),
      advantage({ roll: 'check', ability: 'strength' }),
      advantage({ mode: 'disadvantage', roll: 'save', ability: 'strength' }),
      advantage({ roll: 'save' }),
    ]);
    expect(rule(null, form, at(0))).toBeNull();
    expect(rule(null, form, at(1))).toBeNull();
    expect(rule(null, form, at(2))).toBe(
      'Эти броски уже есть в другой карточке',
    );
    expect(rule(null, form, at(3))).toBeNull();
  });

  it('те же броски с другим условием — не повтор (Опрокинутый)', () => {
    const form = formOf([
      advantage({ roll: 'attacked', when: 'within_5ft' }),
      advantage({ mode: 'disadvantage', roll: 'attacked', when: 'beyond_5ft' }),
      advantage({ mode: 'disadvantage', roll: 'attacked', when: 'within_5ft' }),
    ]);
    expect(rule(null, form, at(1))).toBeNull();
    expect(rule(null, form, at(2))).toBe(
      'Эти броски уже есть в другой карточке',
    );
  });
});
