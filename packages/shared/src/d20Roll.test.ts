import { describe, expect, it } from 'vitest';
import { rollD20, rollModeOf } from './d20Roll.js';

// Кости по очереди из списка: значение кости n из s — (n - 1) / s.
function dice(...values: [number, number][]) {
  const queue = values.map(([n, sides]) => (n - 1) / sides);
  return () => {
    const next = queue.shift();
    if (next === undefined) throw new Error('кости кончились');
    return next;
  };
}

const none = { advantage: [], disadvantage: [] };

describe('rollModeOf', () => {
  it('преимущество и помеха гасят друг друга', () => {
    expect(rollModeOf(none, null)).toBe('normal');
    expect(rollModeOf({ advantage: ['А'], disadvantage: [] }, null)).toBe(
      'advantage',
    );
    expect(rollModeOf({ advantage: [], disadvantage: ['Б'] }, null)).toBe(
      'disadvantage',
    );
    expect(
      rollModeOf({ advantage: ['А', 'В'], disadvantage: ['Б'] }, null),
    ).toBe('normal');
  });

  it('переключатель мастера решает за правила', () => {
    expect(rollModeOf({ advantage: ['А'], disadvantage: [] }, 'normal')).toBe(
      'normal',
    );
    expect(rollModeOf(none, 'disadvantage')).toBe('disadvantage');
  });
});

describe('rollD20', () => {
  it('одна кость и слагаемые', () => {
    const roll = rollD20(
      {
        terms: [{ kind: 'number', label: 'Ловкость', amount: 3 }],
        reasons: none,
        master: null,
      },
      dice([14, 20]),
    );
    expect(roll).toMatchObject({
      dice: [14],
      kept: 0,
      mode: 'normal',
      total: 17,
    });
  });

  it('преимущество берёт большую кость, помеха — меньшую', () => {
    const input = (advantage: boolean) => ({
      terms: [],
      reasons: advantage
        ? { advantage: ['Невидимый'], disadvantage: [] }
        : { advantage: [], disadvantage: ['Врасплох'] },
      master: null,
    });
    const up = rollD20(input(true), dice([5, 20], [12, 20]));
    expect(up).toMatchObject({ dice: [5, 12], kept: 1, total: 12 });
    const down = rollD20(input(false), dice([5, 20], [12, 20]));
    expect(down).toMatchObject({ dice: [5, 12], kept: 0, total: 5 });
  });

  it('кости эффекта прибавляются и вычитаются', () => {
    const roll = rollD20(
      {
        terms: [
          { kind: 'number', label: 'Ловкость', amount: -1 },
          { kind: 'dice', label: 'Наставление', count: 1, die: 4, sign: 1 },
          { kind: 'dice', label: 'Порча', count: 2, die: 4, sign: -1 },
        ],
        reasons: none,
        master: null,
      },
      dice([10, 20], [3, 4], [1, 4], [2, 4]),
    );
    expect(roll.terms[1]).toMatchObject({ rolls: [3], amount: 3 });
    expect(roll.terms[2]).toMatchObject({ rolls: [1, 2], amount: -3 });
    expect(roll.total).toBe(10 - 1 + 3 - 3);
  });
});
