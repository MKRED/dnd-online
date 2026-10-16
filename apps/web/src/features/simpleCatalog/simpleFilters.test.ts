import type { Ability, Effect } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  applySimpleFilters,
  DEFAULT_SIMPLE_FILTERS,
  readSimpleFilters,
  writeSimpleFilters,
  type SimpleFilters,
} from './simpleFilters';
import { ABILITIES, EFFECTS } from './simpleCatalogs';

const base = (name: string) => ({
  id: name,
  authorId: 'u1',
  authorNickname: 'Арвен',
  isPublic: true,
  name,
  description: '',
  sources: [],
  image: null,
  createdAt: '',
  updatedAt: '',
});

const ability = (name: string): Ability => ({
  ...base(name),
  category: 'basic',
  details: {},
  activation: { kind: 'action' },
  costs: { uses: null, spellSlot: null, movement: null, hitDie: false },
});

const effect = (
  name: string,
  components: Effect['components'] = [],
): Effect => ({
  ...base(name),
  components,
  duration: { kind: 'permanent' },
  saveEnds: null,
});

const dark = { kind: 'sense', sense: 'darkvision', range: 60 } as const;

const filter = (list: Effect[], over: Partial<SimpleFilters>) =>
  applySimpleFilters(
    list,
    { ...DEFAULT_SIMPLE_FILTERS, ...over },
    EFFECTS.kinds.of,
  );

describe('simpleFilters', () => {
  it('ищет без учёта регистра и «ё»', () => {
    const list = [effect('Горение'), effect('Тёмное зрение'), effect('Луч')];
    expect(filter(list, { query: 'темное' }).map((e) => e.name)).toEqual([
      'Тёмное зрение',
    ]);
  });

  it('оставляет записи, у которых есть выбранный вид', () => {
    const list = [effect('Горение'), effect('Тёмное зрение', [dark])];
    const names = (categories: string[]) =>
      filter(list, { categories }).map((e) => e.name);
    expect(names(['sense'])).toEqual(['Тёмное зрение']);
    // Эффект без составляющих — «Базовый».
    expect(names(['basic'])).toEqual(['Горение']);
    expect(names(['basic', 'sense'])).toEqual(['Горение', 'Тёмное зрение']);
  });

  it('у способности вид — её категория', () => {
    expect(
      applySimpleFilters(
        [ability('Луч')],
        { ...DEFAULT_SIMPLE_FILTERS, categories: ['basic'] },
        ABILITIES.kinds.of,
      ),
    ).toHaveLength(1);
  });

  it('сортирует по названию, а «Сначала новые» оставляет порядок сервера', () => {
    const list = [effect('Луч'), effect('Горение')];
    expect(filter(list, { sort: 'name' }).map((e) => e.name)).toEqual([
      'Горение',
      'Луч',
    ]);
    expect(filter(list, { sort: 'recent' })).toBe(list);
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
