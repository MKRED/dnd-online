import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ITEM_FILTERS,
  hasActiveFilters,
  readItemFilters,
  writeItemFilters,
} from './filterParams';

describe('itemFilters', () => {
  it('пустой адрес — фильтры по умолчанию', () => {
    expect(readItemFilters(new URLSearchParams())).toEqual(
      DEFAULT_ITEM_FILTERS,
    );
  });

  it('читает фильтры из адреса и отбрасывает неизвестные значения', () => {
    const params = new URLSearchParams(
      'cat=food,potion,food,quest&rarity=epic&q=верёв&sort=price',
    );
    expect(readItemFilters(params)).toEqual({
      categories: ['food', 'quest'],
      rarity: 'any',
      query: 'верёв',
      sort: 'recent',
    });
    expect(readItemFilters(new URLSearchParams('rarity=magic')).rarity).toBe(
      'magic',
    );
    expect(readItemFilters(new URLSearchParams('rarity=rare')).rarity).toBe(
      'rare',
    );
  });

  it('пишет в адрес только отличия от умолчаний и не трогает вкладку', () => {
    const params = new URLSearchParams('tab=catalog&q=старое&sort=name');
    const next = writeItemFilters(params, {
      ...DEFAULT_ITEM_FILTERS,
      categories: ['food', 'material'],
      rarity: 'magic',
    });
    expect(next.toString()).toBe(
      'tab=catalog&cat=food%2Cmaterial&rarity=magic',
    );
  });

  it('туда и обратно без потерь', () => {
    const filters = {
      categories: ['material' as const],
      rarity: 'legendary' as const,
      query: 'Меч',
      sort: 'cost' as const,
    };
    expect(
      readItemFilters(writeItemFilters(new URLSearchParams(), filters)),
    ).toEqual(filters);
  });

  it('сортировка и пробелы в поиске не считаются фильтром', () => {
    expect(
      hasActiveFilters({ ...DEFAULT_ITEM_FILTERS, sort: 'name', query: '  ' }),
    ).toBe(false);
    expect(hasActiveFilters({ ...DEFAULT_ITEM_FILTERS, rarity: 'none' })).toBe(
      true,
    );
  });
});
