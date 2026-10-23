import { describe, expect, it } from 'vitest';
import {
  moveOp,
  objectCell,
  placeBody,
  placeExtent,
  type PlaceSettings,
} from './objectPlacement';

const OGRE = {
  kind: 'monster' as const,
  id: '00000000-0000-4000-8000-000000000001',
  name: 'Огр',
  label: 'Огр · Большой',
  size: 'large' as const,
};
const HERO = {
  kind: 'npc' as const,
  id: '00000000-0000-4000-8000-000000000002',
  name: 'Аня',
  label: 'Аня',
};

const TABLE = {
  kind: 'furniture' as const,
  id: '00000000-0000-4000-8000-000000000003',
  name: 'Стол',
  label: 'Стол',
  modelSize: [3, 1, 1] as [number, number, number],
};

const settings = (patch: Partial<PlaceSettings>): PlaceSettings => ({
  kind: 'start',
  creature: null,
  item: null,
  furniture: null,
  look: 'chest',
  facing: 90,
  hidden: false,
  ...patch,
});

const size = { width: 6, depth: 6 };

describe('placeBody', () => {
  it('старт и контейнер — без выбора в каталоге, контейнер зовётся по виду', () => {
    expect(placeBody(settings({}))).toEqual({ kind: 'start', facing: 90 });
    expect(placeBody(settings({ kind: 'container', look: 'barrel' }))).toEqual({
      kind: 'container',
      name: 'Бочка',
      look: 'barrel',
      items: [],
      facing: 90,
    });
  });

  it('монстр или НПС из одного поиска; НПС — Средний', () => {
    expect(placeBody(settings({ kind: 'creature', creature: OGRE }))).toEqual({
      kind: 'monster',
      monsterId: OGRE.id,
      facing: 90,
    });
    expect(placeBody(settings({ kind: 'creature', creature: HERO }))).toEqual({
      kind: 'npc',
      characterId: HERO.id,
      size: 'medium',
      facing: 90,
    });
  });

  it('«скрыт от игроков» уходит в операцию, только когда выбран', () => {
    expect(placeBody(settings({ hidden: true }))).toEqual({
      kind: 'start',
      facing: 90,
      hidden: true,
    });
    expect(placeBody(settings({ kind: 'item', hidden: true }))).toBeNull();
  });

  it('существо или предмет не выбраны — ставить нечего', () => {
    expect(placeBody(settings({ kind: 'creature' }))).toBeNull();
    expect(placeBody(settings({ kind: 'item' }))).toBeNull();
    expect(placeBody(settings({ kind: 'furniture' }))).toBeNull();
  });

  it('обстановка поворачивается на 90°: 45° округляется назад', () => {
    expect(
      placeBody(settings({ kind: 'furniture', furniture: TABLE, facing: 135 })),
    ).toEqual({ kind: 'furniture', furnitureId: TABLE.id, facing: 90 });
  });
});

describe('место на карте', () => {
  it('место Большого — 2 клетки, курсор в его середине', () => {
    expect(placeExtent(settings({ kind: 'creature', creature: OGRE }))).toEqual(
      [2, 1, 2],
    );
    expect(placeExtent(settings({ kind: 'creature', creature: HERO }))).toEqual(
      [1, 1, 1],
    );
    expect(objectCell([3, 1, 3], [2, 1, 2], size)).toEqual([3, 1, 3]);
    // Огромный (3): курсор в средней клетке.
    expect(objectCell([3, 1, 3], [3, 1, 3], size)).toEqual([2, 1, 2]);
  });

  it('стол 3×1×1: повёрнутый на 90° — вдоль глубины', () => {
    const table = settings({ kind: 'furniture', furniture: TABLE, facing: 0 });
    expect(placeExtent(table)).toEqual([3, 1, 1]);
    expect(placeExtent({ ...table, facing: 270 })).toEqual([1, 1, 3]);
    expect(objectCell([3, 1, 3], [3, 1, 1], size)).toEqual([2, 1, 3]);
  });

  it('место не влезает в карту — null', () => {
    expect(objectCell([5, 1, 2], [2, 1, 2], size)).toBeNull();
    expect(objectCell([0, 1, 0], [3, 1, 3], size)).toBeNull();
    expect(objectCell([5, 1, 5], [1, 1, 1], size)).toEqual([5, 1, 5]);
  });

  it('перенос: в ту же клетку и за границу — без операции', () => {
    const object = { id: 7, at: [1, 1, 1] as [number, number, number] };
    expect(moveOp(object, [4, 2, 0], [1, 1, 1], size)).toEqual({
      op: 'moveObject',
      id: 7,
      at: [4, 2, 0],
    });
    expect(moveOp(object, [1, 1, 1], [1, 1, 1], size)).toBeNull();
    expect(moveOp(object, [5, 1, 1], [2, 1, 2], size)).toBeNull();
    // С Shift — без проверок места на сервере.
    expect(moveOp(object, [4, 2, 0], [1, 1, 1], size, true)).toMatchObject({
      force: true,
    });
  });
});
