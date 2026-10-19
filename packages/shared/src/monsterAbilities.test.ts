import { describe, expect, it } from 'vitest';
import {
  formatPerDay,
  isMonsterSpellPerDay,
  perDayFits,
} from './monsterAbilities.js';

describe('частота заклинания монстра', () => {
  it('целое от 1 до 9', () => {
    expect([1, 3, 9].every(isMonsterSpellPerDay)).toBe(true);
    expect([0, 10, 1.5, '2', null].some(isMonsterSpellPerDay)).toBe(false);
  });

  it('задаётся только заклинанию, снять можно у любой', () => {
    expect(perDayFits({ category: 'spell' }, 2)).toBe(true);
    expect(perDayFits({ category: 'monster' }, 2)).toBe(false);
    expect(perDayFits(null, 2)).toBe(false);
    expect(perDayFits(null, null)).toBe(true);
  });

  it('подпись как в книге', () => {
    expect(formatPerDay(null)).toBe('Неограниченно');
    expect(formatPerDay(2)).toBe('2/день');
  });
});
