import type { Bookmark } from 'shared';
import { describe, expect, it } from 'vitest';
import {
  countBookmarks,
  filterBookmarks,
  readBookmarkFilters,
  writeBookmarkFilters,
} from './bookmarkFilters';

const createdAt = '2026-10-19T10:00:00.000Z';
const seen = (name: string) => ({
  name,
  authorId: 'u1',
  authorNickname: 'Аня',
  image: null,
});
const bookmarks: Bookmark[] = [
  { kind: 'item', targetId: 'i1', createdAt, target: seen('Верёвка') },
  { kind: 'item', targetId: 'i2', createdAt, target: null },
  { kind: 'effect', targetId: 'e1', createdAt, target: seen('Ускорение') },
  {
    kind: 'character',
    targetId: 'c1',
    createdAt,
    target: { ...seen('Торин'), mainImage: null },
  },
];
const ids = (list: Bookmark[]) => list.map((b) => b.targetId);

describe('фильтры закладок', () => {
  it('без фильтров — всё, с плашками', () => {
    expect(ids(filterBookmarks(bookmarks, { kind: null, query: '' }))).toEqual([
      'i1',
      'i2',
      'e1',
      'c1',
    ]);
  });

  it('вид — только его закладки', () => {
    expect(
      ids(filterBookmarks(bookmarks, { kind: 'item', query: '' })),
    ).toEqual(['i1', 'i2']);
  });

  it('поиск без учёта регистра и «ё», плашки при поиске не видны', () => {
    expect(
      ids(filterBookmarks(bookmarks, { kind: null, query: 'ВЕРЕВ' })),
    ).toEqual(['i1']);
  });

  it('число у чипа — по виду, без поиска', () => {
    expect(countBookmarks(bookmarks)).toEqual({
      character: 1,
      item: 2,
      ability: 0,
      effect: 1,
    });
  });

  it('адрес: неизвестный вид — «Все», пустое не пишется', () => {
    expect(readBookmarkFilters(new URLSearchParams('kind=map&q=меч'))).toEqual({
      kind: null,
      query: 'меч',
    });
    expect(writeBookmarkFilters({ kind: 'effect', query: '' }).toString()).toBe(
      'kind=effect',
    );
  });
});
