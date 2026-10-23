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
  items: { [CUP]: { missing: null, name: 'Кубок', image: null, weight: 1 } },
  npcs: {
    [HERO]: {
      missing: null,
      name: 'Аня',
      mainImage: { id: 'img', thumbVersion: 2 },
      model: {
        format: 'stl',
        version: 4,
        color: '#aa3311',
        fit: { scale: 1, turn: 0, up: 'z' },
      },
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
        model: null,
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
        // 3D-модель НПС (docs/plan/done/character-models.md, этап 4).
        model: {
          path: `/characters/${HERO}/model/file?v=4`,
          format: 'stl',
          color: '#aa3311',
          fit: { scale: 1, turn: 0, up: 'z' },
        },
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

  it('миниатюры берёт по переданным путям — сцена игры читает их из библиотеки', () => {
    const images = {
      monster: (id: string, v: number) => `lib/monster/${id}/${v}`,
      item: (id: string, v: number) => `lib/item/${id}/${v}`,
      npc: (id: string, image: { thumbVersion: number }) =>
        `lib/npc/${id}/${image.thumbVersion}`,
      npcModel: (id: string, v: number) => `lib/npc-model/${id}/${v}`,
    };
    const objects = layoutObjects(
      mapWith([
        {
          ...base,
          id: 1,
          at: [0, 1, 0],
          kind: 'monster',
          monsterId: OGRE,
          facing: 0,
        },
        {
          ...base,
          id: 2,
          at: [3, 1, 0],
          kind: 'npc',
          characterId: HERO,
          size: 'medium',
          facing: 0,
        },
      ]),
      refs,
      images,
    );
    expect(objectImagePaths(objects)).toEqual([
      `lib/monster/${OGRE}/3`,
      `lib/npc/${HERO}/2`,
    ]);
    expect(objects[1].look).toMatchObject({
      model: { path: `lib/npc-model/${HERO}/4` },
    });
  });

  it('без содержимого контейнера — подпись по имени, без числа предметов', () => {
    const chest: MapObject = {
      ...base,
      id: 1,
      at: [0, 1, 0],
      kind: 'container',
      name: 'Бочка эля',
      look: 'barrel',
      items: [],
    };
    expect(layoutObjects(mapWith([chest]), refs)[0].label).toBe(
      'Бочка эля (бочка, предметов: 0)',
    );
    expect(
      layoutObjects(mapWith([chest]), refs, undefined, true)[0],
    ).toMatchObject({ label: 'Бочка эля (бочка)', warnings: [] });
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

describe('обстановка на сцене', () => {
  const TABLE = '00000000-0000-4000-8000-0000000000a1';
  const GATE = '00000000-0000-4000-8000-0000000000a2';
  const furnitureRefs: MapObjectRefsView = {
    ...emptyRefsView(),
    furniture: {
      [TABLE]: {
        missing: null,
        name: 'Стол',
        mount: 'floor',
        model: { size: [3, 1, 1], palette: [], voxels: '', cells: {} },
        positions: [],
      },
      // Ворота: закрытые 1×2×1, открытые — 2×2×1 (этап 8г).
      [GATE]: {
        missing: null,
        name: 'Ворота',
        mount: 'doorway',
        model: { size: [1, 2, 1], palette: [], voxels: '', cells: {} },
        positions: [
          {
            name: 'Закрыты',
            model: { size: [1, 2, 1], palette: [], voxels: '', cells: {} },
          },
          {
            name: 'Открыты',
            model: { size: [2, 2, 1], palette: [], voxels: '', cells: {} },
          },
        ],
      },
      [GONE]: { missing: 'deleted' },
    },
  };
  const furniture = (id: number, furnitureId: string, facing: 0 | 90) =>
    ({
      ...base,
      id,
      at: [0, 1, 0],
      kind: 'furniture',
      furnitureId,
      facing,
    }) as MapObject;

  it('место по модели: на 90° ширина и глубина меняются, середина — по месту', () => {
    const [table] = layoutObjects(
      mapWith([furniture(1, TABLE, 90)]),
      furnitureRefs,
    );
    expect(table.look).toMatchObject({ kind: 'furniture', extent: [1, 1, 3] });
    expect(table.base).toEqual([0.5, 1, 1.5]);
    expect(table.top).toBe(2);
  });

  it('ворота рисуются моделью текущего положения', () => {
    const gate = (position?: number) =>
      ({ ...furniture(1, GATE, 0), position }) as MapObject;
    const [closed] = layoutObjects(mapWith([gate()]), furnitureRefs);
    expect(closed.look).toMatchObject({ extent: [1, 2, 1] });
    const [open] = layoutObjects(mapWith([gate(1)]), furnitureRefs);
    expect(open.look).toMatchObject({ extent: [2, 2, 1] });
  });

  it('удалённая обстановка — без модели, одна клетка', () => {
    const [gone] = layoutObjects(
      mapWith([furniture(1, GONE, 0)]),
      furnitureRefs,
    );
    expect(gone.look).toMatchObject({ model: null, extent: [1, 1, 1] });
    expect(gone.warnings.join()).toMatch(/удалена/);
  });
});
