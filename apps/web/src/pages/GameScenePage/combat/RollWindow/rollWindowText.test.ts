import { describe, expect, it } from 'vitest';
import { reasonsText, termAmount } from './rollWindowText';

describe('termAmount', () => {
  it('число — со знаком', () => {
    expect(termAmount({ kind: 'number', label: 'Ловкость', amount: 3 })).toBe(
      '+3',
    );
    expect(termAmount({ kind: 'number', label: 'Ловкость', amount: -1 })).toBe(
      '−1',
    );
  });

  it('кости — до броска и после', () => {
    const dice = {
      kind: 'dice',
      label: 'Порча',
      count: 1,
      die: 4,
      sign: -1,
    } as const;
    expect(termAmount(dice)).toBe('−1к4');
    expect(termAmount({ ...dice, rolls: [3], amount: -3 })).toBe('−3 (1к4: 3)');
  });
});

describe('reasonsText', () => {
  it('обе причины и пусто', () => {
    expect(
      reasonsText({ advantage: ['Бдительность'], disadvantage: ['Врасплох'] }),
    ).toBe('Преимущество: Бдительность · Помеха: Врасплох');
    expect(reasonsText({ advantage: [], disadvantage: [] })).toBeNull();
  });
});
