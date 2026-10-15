import type { Ability } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  applySimpleFilters,
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

describe('simpleFilters', () => {
  it('ищет без учёта регистра и «ё»', () => {
    const list = [entry('Горение'), entry('Тёмное зрение'), entry('Луч')];
    const found = applySimpleFilters(list, { query: 'темное', sort: 'recent' });
    expect(found.map((e) => e.name)).toEqual(['Тёмное зрение']);
  });

  it('сортирует по названию, а «Сначала новые» оставляет порядок сервера', () => {
    const list = [entry('Луч'), entry('Горение')];
    expect(
      applySimpleFilters(list, { query: '', sort: 'name' }).map((e) => e.name),
    ).toEqual(['Горение', 'Луч']);
    expect(applySimpleFilters(list, { query: '', sort: 'recent' })).toBe(list);
  });

  it('читает и пишет адрес, не трогая вкладку и не записывая умолчания', () => {
    const params = new URLSearchParams('tab=catalog&sort=bogus');
    expect(readSimpleFilters(params)).toEqual({ query: '', sort: 'recent' });
    const written = writeSimpleFilters(params, { query: 'луч', sort: 'name' });
    expect(written.toString()).toBe(
      'tab=catalog&sort=name&q=%D0%BB%D1%83%D1%87',
    );
    expect(
      writeSimpleFilters(written, { query: '', sort: 'recent' }).toString(),
    ).toBe('tab=catalog');
  });
});
