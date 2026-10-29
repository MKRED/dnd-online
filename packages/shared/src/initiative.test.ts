import { describe, expect, it } from 'vitest';
import type { EffectComponent } from './effectComponents.js';
import {
  compareInitiative,
  initiativeFromSheet,
  initiativeRollInput,
  initiativeSlot,
  nextTurn,
} from './initiative.js';

const base = { label: 'Ловкость', modifier: 2 };
const nameOf = (source: string) => source;

const advantage = (
  mode: 'advantage' | 'disadvantage',
  roll: 'initiative' | 'check' | 'd20' | 'attack',
  ability: 'dexterity' | 'strength' | null = null,
  when: 'source_in_sight' | null = null,
): EffectComponent => ({ kind: 'advantage', mode, roll, ability, when });

describe('initiativeRollInput', () => {
  it('без эффектов — только модификатор', () => {
    expect(initiativeRollInput(base, [], nameOf, false)).toEqual({
      terms: [{ kind: 'number', label: 'Ловкость', amount: 2 }],
      reasons: { advantage: [], disadvantage: [] },
    });
  });

  it('врасплох — помеха', () => {
    expect(initiativeRollInput(base, [], nameOf, true).reasons).toEqual({
      advantage: [],
      disadvantage: ['Врасплох'],
    });
  });

  it('преимущество и помеха касаются инициативы, проверок Ловкости и Тестов к20', () => {
    const input = initiativeRollInput(
      base,
      [
        { source: 'Предвидение', components: [advantage('advantage', 'd20')] },
        {
          source: 'Ловкость кошки',
          components: [advantage('advantage', 'check', 'dexterity')],
        },
        {
          source: 'Порча',
          components: [advantage('disadvantage', 'check', 'strength')],
        },
        {
          source: 'Страх',
          components: [
            advantage('disadvantage', 'check', null, 'source_in_sight'),
          ],
        },
        { source: 'Ярость', components: [advantage('advantage', 'attack')] },
      ],
      nameOf,
      false,
    );
    expect(input.reasons).toEqual({
      advantage: ['Предвидение', 'Ловкость кошки'],
      disadvantage: [],
    });
  });

  it('состояния книги: Невидимый — преимущество, Недееспособный — помеха', () => {
    const input = initiativeRollInput(
      base,
      [
        {
          source: 'Невидимость',
          components: [{ kind: 'condition', condition: 'invisible' }],
        },
        {
          source: 'Паралич',
          components: [{ kind: 'condition', condition: 'paralyzed' }],
        },
      ],
      (source) => ({ 'condition:invisible': 'Невидимый' })[source] ?? source,
      false,
    );
    expect(input.reasons).toEqual({
      advantage: ['Невидимый'],
      disadvantage: ['condition:incapacitated'],
    });
  });

  it('бонус к броску — кости и число', () => {
    const input = initiativeRollInput(
      base,
      [
        {
          source: 'Наставление',
          components: [
            {
              kind: 'roll_bonus',
              mode: 'bonus',
              roll: 'check',
              ability: null,
              count: 1,
              die: 4,
              number: 1,
              damageType: null,
            },
          ],
        },
      ],
      nameOf,
      false,
    );
    expect(input.terms).toEqual([
      { kind: 'number', label: 'Ловкость', amount: 2 },
      { kind: 'dice', label: 'Наставление', count: 1, die: 4, sign: 1 },
      { kind: 'number', label: 'Наставление', amount: 1 },
    ]);
  });
});

const rank = (initiative: number, modifier = 0) => ({ initiative, modifier });

describe('compareInitiative', () => {
  it('выше итог, потом модификатор', () => {
    expect(compareInitiative(rank(15), rank(12))).toBeLessThan(0);
    expect(compareInitiative(rank(12, 3), rank(12, 1))).toBeLessThan(0);
    expect(compareInitiative(rank(12, 1), rank(12, 1))).toBe(0);
  });
});

describe('initiativeSlot', () => {
  const order = [rank(18), rank(14, 2), rank(14, 2), rank(9)];

  it('встаёт перед первым, кто ему уступает', () => {
    expect(initiativeSlot(order, rank(20))).toBe(0);
    expect(initiativeSlot(order, rank(14, 3))).toBe(1);
    expect(initiativeSlot(order, rank(10))).toBe(3);
    expect(initiativeSlot(order, rank(2))).toBe(4);
    expect(initiativeSlot([], rank(2))).toBe(0);
  });

  it('среди равных — на случайное место', () => {
    expect(initiativeSlot(order, rank(14, 2), () => 0)).toBe(3);
    expect(initiativeSlot(order, rank(14, 2), () => 0.5)).toBe(2);
    expect(initiativeSlot(order, rank(14, 2), () => 0.99)).toBe(1);
  });

  it('в переставленной мастером очереди — перед первым уступающим', () => {
    expect(initiativeSlot([rank(5), rank(18), rank(3)], rank(10))).toBe(0);
  });
});

describe('nextTurn', () => {
  it('следующий, за последним — первый в новом раунде', () => {
    expect(nextTurn(['a', 'b', 'c'], 'a')).toEqual({
      next: 'b',
      wrapped: false,
    });
    expect(nextTurn(['a', 'b', 'c'], 'c')).toEqual({
      next: 'a',
      wrapped: true,
    });
    expect(nextTurn(['a', 'b'], null)).toEqual({ next: 'a', wrapped: false });
    expect(nextTurn([], 'a')).toBeNull();
  });
});

describe('initiativeFromSheet', () => {
  it('названия эффектов и состояний из листа', () => {
    const input = initiativeFromSheet(
      base,
      [
        {
          id: 'e1',
          effect: {
            id: 'inv',
            name: 'Невидимость',
            isPublic: true,
            image: null,
            components: [{ kind: 'condition', condition: 'invisible' }],
            duration: { kind: 'none' },
          },
          missing: null,
          inactive: false,
        } as never,
      ],
      [],
      true,
    );
    expect(input.reasons).toEqual({
      advantage: ['Невидимый'],
      disadvantage: ['Врасплох'],
    });
  });
});
