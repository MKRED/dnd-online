import { describe, expect, it } from 'vitest';
import { canAddRow, clearedRows, EMPTY_ROW, filledParts } from './damageRows';

describe('damageRows', () => {
  it('частями — только заполненные строки, тип как выбран', () => {
    expect(
      filledParts([
        { amount: 6, type: 'piercing' },
        { amount: '', type: 'fire' },
        { amount: 4, type: null },
      ]),
    ).toEqual([
      { amount: 6, type: 'piercing' },
      { amount: 4, type: null },
    ]);
    expect(filledParts([EMPTY_ROW])).toEqual([]);
  });

  it('после правки типы остаются, числа стираются; строк не больше пяти', () => {
    expect(clearedRows([{ amount: 6, type: 'piercing' }])).toEqual([
      { amount: '', type: 'piercing' },
    ]);
    expect(canAddRow(Array(4).fill(EMPTY_ROW))).toBe(true);
    expect(canAddRow(Array(5).fill(EMPTY_ROW))).toBe(false);
  });
});
