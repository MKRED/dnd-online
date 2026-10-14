import type { Item } from 'shared';
import { describe, expect, it } from 'vitest';
import { toFormValues, toItemInput } from './itemFormValues';

describe('itemFormValues', () => {
  it('пустая стоимость — предмет без цены, пустой вес — ноль', () => {
    const values = {
      ...toFormValues(null),
      name: '  Сюжетный ключ ',
      weight: '',
    };
    expect(toItemInput(values)).toEqual({
      name: 'Сюжетный ключ',
      category: 'basic',
      details: {},
      rarity: 'none',
      weight: 0,
      cost: null,
      description: '',
      isPublic: false,
    });
  });

  it('у еды в запрос уходит насыщение, у других категорий details пустые', () => {
    const food = { category: 'food', details: { satiety: 20 } } as Item;
    const values = { ...toFormValues(food), name: 'Хлеб' };
    expect(values.satiety).toBe(20);
    expect(toItemInput(values)).toMatchObject({
      category: 'food',
      details: { satiety: 20 },
    });
    // Сменили категорию — насыщение в форме осталось, но в запрос не идёт.
    expect(toItemInput({ ...values, category: 'quest' })).toMatchObject({
      category: 'quest',
      details: {},
    });
    expect(toFormValues(null).satiety).toBe('');
  });

  it('у сокровища в запрос уходит вид; без сокровища вида в форме нет', () => {
    const gem = { category: 'treasure', details: { kind: 'gem' } } as Item;
    const values = { ...toFormValues(gem), name: 'Рубин' };
    expect(values.treasureKind).toBe('gem');
    expect(toItemInput(values)).toMatchObject({
      category: 'treasure',
      details: { kind: 'gem' },
    });
    expect(toFormValues(null).treasureKind).toBeNull();
  });

  it('переносит предмет в форму и обратно без потерь', () => {
    const item = {
      name: 'Зеркало',
      category: 'quest',
      details: {},
      rarity: 'uncommon',
      weight: 0.5,
      cost: { amount: 5, coin: 'gp' },
      description: 'Стальное',
      isPublic: true,
    } as Item;
    const { name, category, details, rarity, weight, cost, description } = item;
    expect(toItemInput(toFormValues(item))).toEqual({
      name,
      category,
      details,
      rarity,
      weight,
      cost,
      description,
      isPublic: true,
    });
  });
});
