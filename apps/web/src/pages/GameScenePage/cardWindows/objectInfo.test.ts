import { describe, expect, it } from 'vitest';
import { emptyRefsView, type MapObjectRefsView } from 'shared';
import type { ObjectImagePaths } from '../../../features/maps/MapScene';
import { objectInfo } from './objectInfo';

// Сведения об объекте в окне у мастера (docs/plan/done/scene-page.md, этап 6).
const images = {
  item: (id: string, v: number) => `/img/${id}?v=${v}`,
} as ObjectImagePaths;

const refs: MapObjectRefsView = {
  ...emptyRefsView(),
  items: {
    gem: {
      missing: null,
      name: 'Самоцвет',
      image: { version: 2 } as never,
      weight: 0,
    },
    gone: { missing: 'hidden' },
  },
  furniture: {
    door: {
      missing: null,
      name: 'Дверь',
      mount: 'doorway',
      model: null,
      positions: [
        { name: 'Закрыта', model: null },
        { name: 'Открыта', model: null },
      ],
      container: null,
    },
    chest: {
      missing: null,
      name: 'Сундук',
      mount: 'floor',
      model: null,
      positions: [],
      container: { capacity: 10, lockDc: 15 },
    },
  },
};

const at = { id: 1, at: [0, 1, 0], hidden: false } as const;

describe('objectInfo', () => {
  it('контейнер — содержимое с картинками; недоступный предмет так и назван', () => {
    const info = objectInfo(
      {
        ...at,
        kind: 'container',
        name: 'Бочка',
        look: 'barrel',
        items: [
          { itemId: 'gem', quantity: 2 },
          { itemId: 'gone', quantity: 1 },
        ],
      },
      refs,
      images,
    );
    expect(info?.title).toBe('Бочка');
    expect(info?.items).toEqual([
      { itemId: 'gem', quantity: 2, name: 'Самоцвет', image: '/img/gem?v=2' },
      { itemId: 'gone', quantity: 1, name: 'Предмет недоступен', image: null },
    ]);
  });

  it('дверь — положения и замок, без содержимого', () => {
    const info = objectInfo(
      {
        ...at,
        kind: 'furniture',
        furnitureId: 'door',
        facing: 0,
        position: 1,
        locked: true,
      },
      refs,
      images,
    );
    expect(info).toMatchObject({
      title: 'Дверь',
      items: null,
      locked: true,
      positions: ['Закрыта', 'Открыта'],
      position: 1,
    });
  });

  it('сундук-обстановка — содержимое и Сл замка в подписи', () => {
    const info = objectInfo(
      {
        ...at,
        kind: 'furniture',
        furnitureId: 'chest',
        facing: 0,
        locked: true,
        items: [],
      },
      refs,
      images,
    );
    expect(info?.items).toEqual([]);
    expect(info?.subtitle).toContain('Сл 15');
  });
});
