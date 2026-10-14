import { describe, expect, it } from 'vitest';
import { formatCost, formatWeight } from './itemLabels';

describe('itemLabels', () => {
  it('пишет вес в фунтах с запятой, а нулевой — прочерком', () => {
    expect(formatWeight(0.5)).toBe('0,5 фнт.');
    expect(formatWeight(58.5)).toBe('58,5 фнт.');
    expect(formatWeight(3)).toBe('3 фнт.');
    expect(formatWeight(0)).toBe('—');
  });

  it('пишет стоимость с сокращением монеты', () => {
    expect(formatCost({ amount: 15, coin: 'gp' })).toBe('15 ЗМ');
    expect(formatCost({ amount: 2, coin: 'sp' })).toBe('2 СМ');
    expect(formatCost(null)).toBe('—');
  });
});
