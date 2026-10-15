import type { Ability, Effect } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  applySimpleFilters,
  DEFAULT_SIMPLE_FILTERS,
  readSimpleFilters,
  writeSimpleFilters,
} from './simpleFilters';

const entry = (name: string): Ability => ({
  id: name,
  authorId: 'u1',
  authorNickname: 'Арвен',
  isPublic: true,
  name,
  category: 'basic',
  details: {},
  description: '',
  image: null,
  createdAt: '',
  updatedAt: '',
});

const sense = (name: string): Effect => ({
  ...entry(name),
  category: 'sense',
  details: { sense: 'darkvision', range: 60 },
  duration: { kind: 'permanent' },
});

describe('simpleFilters', () => {
  it('ищет без учёта регистра и «ё»', () => {
    const list = [entry('Горение'), entry('Тёмное зрение'), entry('Луч')];
    const found = applySimpleFilters(list, {
      query: 'темное',
      categories: [],
      sort: 'recent',
    });
    expect(found.map((e) => e.name)).toEqual(['Тёмное зрение']);
  });

  it('оставляет записи выбранных категорий', () => {
    const list = [entry('Горение'), sense('Тёмное зрение')];
    expect(
      applySimpleFilters(list, {
        query: '',
        categories: ['sense'],
        sort: 'recent',
      }).map((e) => e.name),
    ).toEqual(['Тёмное зрение']);
  });

  it('сортирует по названию, а «Сначала новые» оставляет порядок сервера', () => {
    const list = [entry('Луч'), entry('Горение')];
    expect(
      applySimpleFilters(list, { query: '', categories: [], sort: 'name' }).map(
        (e) => e.name,
      ),
    ).toEqual(['Горение', 'Луч']);
    expect(
      applySimpleFilters(list, { query: '', categories: [], sort: 'recent' }),
    ).toBe(list);
  });

  it('читает и пишет адрес, не трогая вкладку и не записывая умолчания', () => {
    const params = new URLSearchParams('tab=catalog&sort=bogus&cat=aura');
    expect(readSimpleFilters(params, ['basic', 'sense'])).toEqual({
      query: '',
      categories: [],
      sort: 'recent',
    });
    const written = writeSimpleFilters(params, {
      query: 'луч',
      categories: ['sense'],
      sort: 'name',
    });
    expect(written.toString()).toBe(
      'tab=catalog&sort=name&cat=sense&q=%D0%BB%D1%83%D1%87',
    );
    expect(readSimpleFilters(written, ['basic', 'sense']).categories).toEqual([
      'sense',
    ]);
    expect(writeSimpleFilters(written, DEFAULT_SIMPLE_FILTERS).toString()).toBe(
      'tab=catalog',
    );
  });
});
