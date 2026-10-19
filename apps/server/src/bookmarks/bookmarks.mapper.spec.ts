import { describe, expect, it } from 'vitest';
import { toBookmark, type BookmarkRow } from './bookmarks.mapper.js';

const createdAt = new Date('2026-10-19T10:00:00Z');
const empty: BookmarkRow = {
  characterId: null,
  itemId: null,
  abilityId: null,
  effectId: null,
  monsterId: null,
  createdAt,
  name: null,
  authorId: null,
  authorNickname: null,
  mainImage: null,
  itemImage: null,
  abilityImage: null,
  effectImage: null,
  monsterImage: null,
};
const seen = { name: 'Меч', authorId: 'u1', authorNickname: 'Аня' };
const imageRow = {
  ownerId: 'e1',
  width: 400,
  height: 300,
  thumbCrop: { x: 0, y: 0, size: 400 },
  version: 3,
  createdAt,
  updatedAt: createdAt,
};

describe('toBookmark', () => {
  it('вид — по заполненной ссылке, картинка — своего каталога', () => {
    expect(
      toBookmark({ ...empty, ...seen, effectId: 'e1', effectImage: imageRow }),
    ).toEqual({
      kind: 'effect',
      targetId: 'e1',
      createdAt: '2026-10-19T10:00:00.000Z',
      target: {
        ...seen,
        image: {
          version: 3,
          width: 400,
          height: 300,
          thumbCrop: imageRow.thumbCrop,
        },
      },
    });
  });

  it('персонаж — с основной картинкой галереи', () => {
    const mainImage = { id: 'img', thumbVersion: 2 };
    expect(
      toBookmark({ ...empty, ...seen, characterId: 'c1', mainImage }).target,
    ).toEqual({ ...seen, mainImage });
  });

  it('монстр — с картинкой своего каталога', () => {
    expect(
      toBookmark({
        ...empty,
        ...seen,
        monsterId: 'm1',
        monsterImage: imageRow,
      }),
    ).toMatchObject({
      kind: 'monster',
      targetId: 'm1',
      target: { ...seen, image: { version: 3 } },
    });
  });

  it('цель скрыта (автора нет) — плашка без полей цели', () => {
    expect(toBookmark({ ...empty, itemId: 'i1' })).toEqual({
      kind: 'item',
      targetId: 'i1',
      createdAt: '2026-10-19T10:00:00.000Z',
      target: null,
    });
  });

  it('строка без цели — ошибка', () => {
    expect(() => toBookmark(empty)).toThrow();
  });
});
