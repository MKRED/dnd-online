import type { SenseKind } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  effectValidate,
  fromEffectValues,
  newComponent,
  toEffectValues,
  type EffectValues,
} from './effectForm';

const sense = (kind: SenseKind | null, range: number | string = '') => ({
  ...newComponent('sense'),
  sense: kind,
  range,
});
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

  it('требует характеристику только с галочкой', () => {
    const { ability } = effectValidate.saveEnds;
    expect(ability(null, values({}))).toBeNull();
    const on = values({ saveEnds: { on: true, ability: null, edge: 'end' } });
    expect(ability(null, on)).toBe('Выберите характеристику');
  });
});
