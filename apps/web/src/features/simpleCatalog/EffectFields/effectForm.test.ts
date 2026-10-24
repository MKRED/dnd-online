import type { ConditionKind, SenseKind } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  effectValidate,
  fromEffectValues,
  newComponent,
  toEffectValues,
  type ComponentValues,
  type EffectValues,
} from './effectForm';

const sense = (kind: SenseKind | null, range: number | string = '') => ({
  ...newComponent('sense'),
  sense: kind,
  range,
});
const condition = (kind: ConditionKind | null) => ({
  ...newComponent('condition'),
  condition: kind,
});
const perTurn = (over: Partial<ComponentValues['perTurn']> = {}) => {
  const component = newComponent('per_turn');
  return { ...component, perTurn: { ...component.perTurn, ...over } };
};
const values = (effect: Partial<EffectValues>) => ({
  effect: { ...toEffectValues(), ...effect },
});

describe('effectForm', () => {
  it('без эффекта — без составляющих и без спасброска', () => {
    expect(toEffectValues()).toMatchObject({
      components: [],
      saveEnds: { on: false, ability: null, edge: 'end' },
    });
  });

  it('собирает чувства и не отправляет дистанцию у видения невидимого', () => {
    const { effect } = values({
      components: [sense('darkvision', 60), sense('see_invisible', 60)],
    });
    expect(fromEffectValues(effect).components).toEqual([
      { kind: 'sense', sense: 'darkvision', range: 60 },
      { kind: 'sense', sense: 'see_invisible', range: null },
    ]);
  });

  it('снятая галочка спасброска — null, выбранное в форме остаётся', () => {
    const saveEnds = { on: false, ability: 'wisdom', edge: 'start' } as const;
    expect(fromEffectValues(values({ saveEnds }).effect).saveEnds).toBeNull();
    const on = values({ saveEnds: { ...saveEnds, on: true } });
    expect(fromEffectValues(on.effect).saveEnds).toEqual({
      ability: 'wisdom',
      edge: 'start',
    });
  });

  it('проверяет вид, повтор и дистанцию своей строки', () => {
    const { sense: checkSense, range } = effectValidate.components;
    const form = values({
      components: [
        sense('darkvision', 60),
        sense('darkvision'),
        sense('see_invisible'),
      ],
    });
    const at = (index: number, field: string) =>
      `effect.components.${index}.${field}`;
    expect(checkSense(null, form, at(0, 'sense'))).toBe('Выберите вид чувства');
    expect(checkSense('darkvision', form, at(0, 'sense'))).toBeNull();
    expect(checkSense('darkvision', form, at(1, 'sense'))).toBe(
      'Это чувство уже есть в эффекте',
    );
    expect(range('', form, at(1, 'range'))).not.toBeNull();
    expect(range(62, form, at(0, 'range'))).not.toBeNull();
    expect(range('', form, at(2, 'range'))).toBeNull();
  });

  it('собирает состояния и читает их обратно', () => {
    const { effect } = values({
      components: [condition('poisoned'), sense('darkvision', 60)],
    });
    const fields = fromEffectValues(effect);
    expect(fields.components).toEqual([
      { kind: 'condition', condition: 'poisoned' },
      { kind: 'sense', sense: 'darkvision', range: 60 },
    ]);
    const back = toEffectValues(fields);
    expect(back.components[0]).toMatchObject({
      kind: 'condition',
      condition: 'poisoned',
    });
  });

  it('у состояния свои правила, а правила чувства его не трогают', () => {
    const rules = effectValidate.components;
    const form = values({
      components: [condition('prone'), condition('prone'), condition(null)],
    });
    const at = (index: number, field: string) =>
      `effect.components.${index}.${field}`;
    expect(rules.sense(null, form, at(0, 'sense'))).toBeNull();
    expect(rules.range('', form, at(0, 'range'))).toBeNull();
    expect(rules.condition('prone', form, at(0, 'condition'))).toBeNull();
    expect(rules.condition('prone', form, at(1, 'condition'))).toBe(
      'Это состояние уже есть в эффекте',
    );
    expect(rules.condition(null, form, at(2, 'condition'))).toBe(
      'Выберите состояние',
    );
    // И наоборот: у чувства нет ошибки состояния.
    const senses = values({ components: [sense('darkvision', 60)] });
    expect(rules.condition(null, senses, at(0, 'condition'))).toBeNull();
  });

  it('урон за ход: в запросе числа, тип урона только у урона', () => {
    const { effect } = values({
      components: [
        perTurn({ damageType: 'fire' }),
        perTurn({
          outcome: 'temp_hp',
          damageType: 'fire',
          count: 0,
          addModifier: true,
        }),
      ],
    });
    const { components } = fromEffectValues(effect);
    expect(components).toEqual([
      {
        kind: 'per_turn',
        outcome: 'damage',
        damageType: 'fire',
        count: 1,
        die: 6,
        bonus: 0,
        addModifier: false,
        edge: 'start',
      },
      expect.objectContaining({
        outcome: 'temp_hp',
        damageType: null,
        count: 0,
      }),
    ]);
    const back = toEffectValues(fromEffectValues(effect));
    expect(back.components[0].perTurn).toMatchObject({
      die: '6',
      damageType: 'fire',
    });
  });

  it('урон за ход: тип, пустая сумма и пределы — у своей карточки', () => {
    const rules = effectValidate.components.perTurn;
    const form = values({
      components: [
        perTurn(),
        perTurn({ outcome: 'healing', count: 0, bonus: 0 }),
        condition('prone'),
      ],
    });
    const at = (index: number, field: string) =>
      `effect.components.${index}.perTurn.${field}`;
    expect(rules.damageType(null, form, at(0, 'damageType'))).toBe(
      'Выберите тип урона',
    );
    expect(rules.damageType(null, form, at(1, 'damageType'))).toBeNull();
    expect(rules.count(0, form, at(1, 'count'))).toBe(
      'Укажите кости, число или модификатор',
    );
    expect(rules.count(41, form, at(0, 'count'))).toBe('От 0 до 40');
    expect(rules.count('', form, at(0, 'count'))).toBe('От 0 до 40');
    expect(rules.bonus(101, form, at(0, 'bonus'))).toBe('От 0 до 100');
    // У состояния правил урона нет.
    expect(rules.count(0, form, at(2, 'count'))).toBeNull();
  });

  it('запрет лечения уходит без полей и читается обратно', () => {
    const { effect } = values({ components: [newComponent('no_healing')] });
    const fields = fromEffectValues(effect);
    expect(fields.components).toEqual([{ kind: 'no_healing' }]);
    const back = toEffectValues(fields);
    expect(back.components[0].kind).toBe('no_healing');
  });

  it('требует характеристику только с галочкой', () => {
    const { ability } = effectValidate.saveEnds;
    expect(ability(null, values({}))).toBeNull();
    const on = values({ saveEnds: { on: true, ability: null, edge: 'end' } });
    expect(ability(null, on)).toBe('Выберите характеристику');
  });
});
