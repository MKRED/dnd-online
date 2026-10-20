import {
  applyOps,
  createMapObjects,
  createPalette,
  emptyRefsView,
  MemoryChunkStore,
  type MapObject,
  type MapObjectRefsView,
} from 'shared';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { MapViewState } from '../../mapStateFromChunks';
import { facingAngle, layoutObjects, objectImagePaths } from './objectLayout';

const OGRE = '00000000-0000-4000-8000-000000000001';
const GONE = '00000000-0000-4000-8000-000000000002';
const CUP = '00000000-0000-4000-8000-000000000003';
const HERO = '00000000-0000-4000-8000-000000000004';

// Карта 6 × 6: каменный пол 4 × 4 на y = 0 и плита в [3, 1, 3].
function mapWith(objects: MapObject[]): MapViewState {
  const state = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 6, depth: 6 },
  };
  applyOps(state, [
    { op: 'fillBox', from: [0, 0, 0], to: [3, 0, 3], block: 'stone' },
    { op: 'setBlock', at: [3, 1, 3], block: 'stone_slab' },
  ]);
  return { ...state, objects: createMapObjects(objects, 100) };
}

const base = { hidden: false } as const;
const refs: MapObjectRefsView = {
  ...emptyRefsView(),
  monsters: {
    [OGRE]: {
      missing: null,
      name: 'огр',
      size: 'large',
      role: 'regular',
      image: {
        version: 3,
        width: 10,
        height: 10,
        thumbCrop: { x: 0, y: 0, size: 10 },
      },
    },
    [GONE]: { missing: 'deleted', size: 'medium' },
  },
  items: { [CUP]: { missing: null, name: 'Кубок', image: null } },
  npcs: {
    [HERO]: {
      missing: null,
      name: 'Аня',
      mainImage: { id: 'img', thumbVersion: 2 },
    },
  },
};

describe('facingAngle', () => {
  // Стрелка остриём к −z, повёрнутая так же, как в сцене: 90° смотрит на восток (+x).
  const direction = (facing: 0 | 90 | 180 | 270) => {
    const arrow = new Vector3(0, 0, -1).applyAxisAngle(
      new Vector3(0, 1, 0),
      facingAngle(facing),
    );
    // + 0 превращает −0 в 0.
    return [Math.round(arrow.x) + 0, Math.round(arrow.z) + 0];
  };

  it('считает взгляд по часовой от севера', () => {
    expect(direction(0)).toEqual([0, -1]);
    expect(direction(90)).toEqual([1, 0]);
    expect(direction(180)).toEqual([0, 1]);
    expect(direction(270)).toEqual([-1, 0]);
  });
});

describe('layoutObjects', () => {
  it('ставит существо по размеру, с картинкой и подписью из сводки', () => {
    const [ogre] = layoutObjects(
      mapWith([
        {
          ...base,
          id: 1,
          at: [0, 1, 0],
          kind: 'monster',
          monsterId: OGRE,
          facing: 90,
        },
      ]),
      refs,
    );
    expect(ogre).toMatchObject({
      level: 1,
      base: [1, 1, 1],
      footprint: 2,
      top: 4,
      label: 'огр',
      blocked: false,
      look: {
        kind: 'creature',
        side: 'monster',
        size: 'large',
        facing: 90,
        image: `/monsters/${OGRE}/image?variant=thumb&v=3`,
        letter: 'О',
        missing: false,
      },
    });
  });

  it('номера стартов, плита под ногами и красный, где стоять нельзя', () => {
    const [first, onSlab, nowhere] = layoutObjects(
      mapWith([
        { ...base, id: 4, at: [5, 1, 5], kind: 'start', facing: 0 },
        { ...base, id: 2, at: [1, 1, 1], kind: 'start', facing: 0 },
        { ...base, id: 3, at: [3, 1, 3], kind: 'start', facing: 0 },
      ]),
      refs,
    );
    expect(first).toMatchObject({ id: 2, look: { number: 1 }, blocked: false });
    expect(onSlab).toMatchObject({
      id: 3,
      look: { number: 2 },
      blocked: false,
    });
    expect(onSlab.base[1]).toBe(1.5);
    // Пол кончается на x = 3 — опоры нет.
    expect(nowhere).toMatchObject({
      id: 4,
      look: { number: 3 },
      blocked: true,
    });
  });

  it('заглушка, НПС без размера в каталоге, предмет без картинки', () => {
    const objects = layoutObjects(
      mapWith([
        {
          ...base,
          id: 1,
          at: [0, 1, 0],
          kind: 'monster',
          monsterId: GONE,
          facing: 0,
        },
        {
          ...base,
          id: 2,
          at: [1, 1, 0],
          kind: 'npc',
          characterId: HERO,
          size: 'tiny',
          facing: 0,
        },
        {
          ...base,
          id: 3,
          at: [2, 1, 0],
          kind: 'item',
          itemId: CUP,
          quantity: 2,
        },
      ]),
      refs,
    );
    expect(objects[0].look).toMatchObject({
      letter: '?',
      missing: true,
      image: null,
    });
    expect(objects[1]).toMatchObject({
      base: [1.5, 1, 0.5],
      footprint: 0.5,
      look: {
        side: 'npc',
        image: `/characters/${HERO}/images/img/file?variant=thumb&v=2`,
      },
    });
    expect(objects[2]).toMatchObject({
      label: 'Кубок ×2',
      look: { kind: 'item', letter: 'К', image: null },
    });
    expect(objectImagePaths(objects)).toEqual([
      `/characters/${HERO}/images/img/file?variant=thumb&v=2`,
    ]);
  });

  it('не рисует объекты за границей карты', () => {
    const objects = layoutObjects(
      mapWith([
        {
          ...base,
          id: 1,
          at: [5, 1, 0],
          kind: 'monster',
          monsterId: OGRE,
          facing: 0,
        },
        {
          ...base,
          id: 2,
          at: [5, 1, 5],
          kind: 'container',
          name: 'Сундук',
          look: 'chest',
          items: [],
        },
      ]),
      refs,
    );
    expect(objects.map((o) => o.id)).toEqual([2]);
  });
});
