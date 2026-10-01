import { describe, expect, it } from 'vitest';
import {
  formatModifier,
  getAbilityModifier,
  getSavingThrowBonus,
  getSkillBonus,
} from './abilityMath';

describe('getAbilityModifier', () => {
  it.each([
    [1, -5],
    [8, -1],
    [9, -1],
    [10, 0],
    [11, 0],
    [12, 1],
    [15, 2],
    [20, 5],
    [30, 10],
  ])('значение %i → модификатор %i', (score, expected) => {
    expect(getAbilityModifier(score)).toBe(expected);
  });
});

describe('formatModifier', () => {
  it('ставит плюс у нуля и положительных', () => {
    expect(formatModifier(0)).toBe('+0');
    expect(formatModifier(3)).toBe('+3');
  });

  it('оставляет минус у отрицательных', () => {
    expect(formatModifier(-2)).toBe('-2');
  });
});

describe('getSavingThrowBonus', () => {
  it('добавляет бонус мастерства только при владении', () => {
    expect(getSavingThrowBonus(14, false, 2)).toBe(2);
    expect(getSavingThrowBonus(14, true, 2)).toBe(4);
  });
});

describe('getSkillBonus', () => {
  it('без владения — только модификатор', () => {
    expect(getSkillBonus(16, false, false, 3)).toBe(3);
  });

  it('владение добавляет бонус мастерства', () => {
    expect(getSkillBonus(16, true, false, 3)).toBe(6);
  });

  it('компетентность удваивает бонус мастерства', () => {
    expect(getSkillBonus(16, true, true, 3)).toBe(9);
  });

  it('компетентность без владения не действует', () => {
    expect(getSkillBonus(16, false, true, 3)).toBe(3);
  });
});
