import { describe, expect, it } from 'vitest';
import { damageDealtParts, damageTotal } from './damageDealt.js';

describe('damageDealt', () => {
  it('сумма частей', () => {
    expect(
      damageTotal([
        { amount: 6, type: 'piercing' },
        { amount: 4, type: 'necrotic' },
      ]),
    ).toBe(10);
    expect(damageTotal([])).toBe(0);
  });

  it('у старой записи без частей — одна часть без типа', () => {
    expect(damageDealtParts({ amount: 7 })).toEqual([
      { amount: 7, type: null },
    ]);
    const parts = [{ amount: 3, type: 'fire' as const }];
    expect(damageDealtParts({ amount: 3, parts })).toBe(parts);
  });
});
