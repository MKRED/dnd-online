import { describe, expect, it } from 'vitest';
import { categoryValidate, toCategoryVariant } from './categoryValues';

describe('categoryValues', () => {
  it('собирает чувство с дистанцией и без неё', () => {
    expect(
      toCategoryVariant('sense', { sense: 'darkvision', senseRange: 60 }),
    ).toEqual({
      category: 'sense',
      details: { sense: 'darkvision', range: 60 },
    });
    // Дистанция, введённая для другого вида, не уходит.
    expect(
      toCategoryVariant('sense', { sense: 'see_invisible', senseRange: 60 }),
    ).toEqual({
      category: 'sense',
      details: { sense: 'see_invisible', range: null },
    });
  });

  it('у «Базового» поля чувства не отправляет', () => {
    expect(
      toCategoryVariant('basic', { sense: 'darkvision', senseRange: 60 }),
    ).toEqual({ category: 'basic', details: {} });
  });

  it('требует вид и дистанцию, кратную 5, только у чувства', () => {
    const values = { category: 'sense', sense: null, senseRange: '' };
    expect(categoryValidate.sense(null, values)).toBe('Выберите вид чувства');
    expect(
      categoryValidate.sense(null, { ...values, category: 'basic' }),
    ).toBeNull();
    const dark = { ...values, sense: 'darkvision' as const };
    expect(categoryValidate.senseRange('', dark)).not.toBeNull();
    expect(categoryValidate.senseRange(62, dark)).not.toBeNull();
    expect(categoryValidate.senseRange(120, dark)).toBeNull();
    expect(
      categoryValidate.senseRange('', { ...values, sense: 'see_invisible' }),
    ).toBeNull();
  });
});
