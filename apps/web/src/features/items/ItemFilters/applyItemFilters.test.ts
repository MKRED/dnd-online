import type { Item } from 'shared';
import { describe, expect, it } from 'vitest';
import { countByCategory, filterItems, sortItems } from './applyItemFilters';
import { DEFAULT_ITEM_FILTERS } from './filterParams';

function item(overrides: Partial<Item>): Item {
  return {
    id: overrides.name ?? 'x',
    authorId: 'a',
    authorNickname: 'Автор',
    isPublic: true,
    name: 'Предмет',
    category: 'basic',
    details: {},
    rarity: 'none',
    weight: 0,
    cost: null,
    description: '',
    image: null,
    createdAt: '2026-10-14T00:00:00.000Z',
    updatedAt: '2026-10-14T00:00:00.000Z',
    ...overrides,
    // Partial от объединения не сужается по category — проверку типа берём на себя.
  } as Item;
}

// Порядок как с сервера — «сначала новые».
const items = [
  item({ name: 'Верёвка', weight: 5, cost: { amount: 1, coin: 'gp' } }),
  item({
    name: 'Рацион',
    category: 'food',
    details: { satiety: 20 },
    weight: 2,
    cost: { amount: 5, coin: 'sp' },
  }),
  item({
    name: 'Зелье лечения',
    category: 'food',
    details: { satiety: 0 },
    rarity: 'common',
    weight: 0.5,
    cost: { amount: 50, coin: 'gp' },
  }),
  item({ name: 'Ключ от башни', category: 'quest' }),
  item({
    name: 'железная руда',
    category: 'material',
    weight: 10,
    cost: { amount: 1, coin: 'pp' },
  }),
];

const names = (list: Item[]) => list.map((i) => i.name);

describe('filterItems', () => {
  it('без фильтров — все предметы в том же порядке', () => {
    expect(filterItems(items, DEFAULT_ITEM_FILTERS)).toEqual(items);
  });

  it('несколько категорий — любая из них', () => {
    const filters = {
      ...DEFAULT_ITEM_FILTERS,
      categories: ['food' as const, 'quest' as const],
    };
    expect(names(filterItems(items, filters))).toEqual([
      'Рацион',
      'Зелье лечения',
      'Ключ от башни',
    ]);
  });

  it('поиск без учёта регистра и с «ё» = «е»', () => {
    const search = (query: string) =>
      names(filterItems(items, { ...DEFAULT_ITEM_FILTERS, query }));
    expect(search('ВЕРЕВ')).toEqual(['Верёвка']);
    expect(search(' Железная ')).toEqual(['железная руда']);
    expect(search('нет такого')).toEqual([]);
  });

  it('редкость: магические, без редкости, конкретная', () => {
    const byRarity = (rarity: typeof DEFAULT_ITEM_FILTERS.rarity) =>
      names(filterItems(items, { ...DEFAULT_ITEM_FILTERS, rarity }));
    expect(byRarity('magic')).toEqual(['Зелье лечения']);
    expect(byRarity('none')).toHaveLength(4);
    expect(byRarity('rare')).toEqual([]);
  });
});

describe('countByCategory', () => {
  it('учитывает поиск и редкость, но не выбор категорий', () => {
    const filters = {
      ...DEFAULT_ITEM_FILTERS,
      categories: ['quest' as const],
      rarity: 'none' as const,
    };
    expect(countByCategory(items, filters)).toEqual({
      basic: 1,
      food: 1,
      material: 1,
      quest: 1,
    });
  });
});

describe('sortItems', () => {
  it('«сначала новые» оставляет порядок сервера', () => {
    expect(sortItems(items, 'recent')).toBe(items);
  });

  it('по названию — по алфавиту без учёта регистра', () => {
    expect(names(sortItems(items, 'name'))).toEqual([
      'Верёвка',
      'железная руда',
      'Зелье лечения',
      'Ключ от башни',
      'Рацион',
    ]);
  });

  it('по весу — сначала лёгкие, равные в порядке сервера', () => {
    expect(names(sortItems(items, 'weight'))).toEqual([
      'Ключ от башни',
      'Зелье лечения',
      'Рацион',
      'Верёвка',
      'железная руда',
    ]);
  });

  it('по цене — в пересчёте на медь, без цены в конце', () => {
    // 5 СМ = 50 ММ < 1 ЗМ = 100 ММ < 50 ЗМ = 5000 ММ; 1 ПМ = 1000 ММ.
    expect(names(sortItems(items, 'cost'))).toEqual([
      'Рацион',
      'Верёвка',
      'железная руда',
      'Зелье лечения',
      'Ключ от башни',
    ]);
  });
});
