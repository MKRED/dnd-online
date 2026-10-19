import type { Monster, MonsterChallenge, MonsterType } from 'shared';
import { describe, expect, it } from 'vitest';
import { sampleMonster } from '../../../test/monsterFixture';
import {
  applyMonsterFilters,
  DEFAULT_MONSTER_FILTERS,
  readMonsterFilters,
  writeMonsterFilters,
} from './monsterFilters';

const monster = (
  name: string,
  category: MonsterType,
  challenge: MonsterChallenge,
): Monster => ({
  ...sampleMonster,
  id: name,
  name,
  category,
  statBlock: { ...sampleMonster.statBlock, challenge },
});

const monsters = [
  monster('Крыса', 'beast', '0'),
  monster('Гоблин', 'humanoid', '1/4'),
  monster('Волк', 'beast', '1/4'),
  monster('Огр', 'giant', '2'),
  monster('Аболет', 'aberration', '10'),
];
const names = (list: Monster[]) => list.map((m) => m.name);

describe('фильтры монстров', () => {
  it('ПО — диапазон по порядку таблицы, дроби меньше единицы', () => {
    const found = applyMonsterFilters(monsters, {
      ...DEFAULT_MONSTER_FILTERS,
      crMin: '1/8',
      crMax: '2',
    });
    expect(names(found)).toEqual(['Гоблин', 'Волк', 'Огр']);
  });

  it('одна граница, типы, поиск и сортировка по названию', () => {
    expect(
      names(
        applyMonsterFilters(monsters, {
          ...DEFAULT_MONSTER_FILTERS,
          crMin: '1/4',
          types: ['beast', 'giant'],
          sort: 'name',
        }),
      ),
    ).toEqual(['Волк', 'Огр']);
    expect(
      names(
        applyMonsterFilters(monsters, {
          ...DEFAULT_MONSTER_FILTERS,
          query: 'ОГР',
        }),
      ),
    ).toEqual(['Огр']);
  });

  it('«от» больше «до» — ничего не подходит', () => {
    expect(
      applyMonsterFilters(monsters, {
        ...DEFAULT_MONSTER_FILTERS,
        crMin: '5',
        crMax: '1',
      }),
    ).toEqual([]);
  });

  it('читает и пишет адрес, неизвестное отбрасывает', () => {
    const params = new URLSearchParams(
      'tab=catalog&cat=beast,kaiju,beast&cr_min=1/4&cr_max=31&sort=name',
    );
    const filters = readMonsterFilters(params);
    expect(filters).toEqual({
      query: '',
      types: ['beast'],
      crMin: '1/4',
      crMax: null,
      sort: 'name',
    });
    const written = writeMonsterFilters(params, { ...filters, crMax: '2' });
    expect(written.get('tab')).toBe('catalog');
    expect(written.get('cr_min')).toBe('1/4');
    expect(written.get('cr_max')).toBe('2');
    expect(
      writeMonsterFilters(written, DEFAULT_MONSTER_FILTERS).toString(),
    ).toBe('tab=catalog');
  });
});
