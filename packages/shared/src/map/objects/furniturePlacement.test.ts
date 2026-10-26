import { describe, expect, it } from 'vitest';
import { MemoryChunkStore, readCell } from '../chunkStore.js';
import { editMap, type EditableMap } from '../mapEdit.js';
import type { MapOp } from '../ops.js';
import { createPalette } from '../palette.js';
import { rotateModelCell } from './furniturePlacement.js';
import { createMapObjects } from './mapObject.js';
import { emptyObjectRefs, objectBox, type ObjectRefs } from './objectRefs.js';

// Обстановка на карте (docs/plan/blocks.md, этап 8в): место по модели с поворотом на
// 90°, строгие пересечения и опора по креплению, force (Shift) — без проверок.

const limits = { maxSize: 64, maxHeight: 16 };
const TABLE = '00000000-0000-4000-8000-0000000000a1';
const PAINTING = '00000000-0000-4000-8000-0000000000a2';
const LAMP = '00000000-0000-4000-8000-0000000000a3';
const FOREIGN = '00000000-0000-4000-8000-0000000000a4';
const GATE = '00000000-0000-4000-8000-0000000000a5';
const CHEST = '00000000-0000-4000-8000-0000000000a6';
const GOLD = '00000000-0000-4000-8000-0000000000b1';

function refs(): ObjectRefs {
  const r = emptyObjectRefs();
  // Стол 2×1×1 (ширина 2, высота 1, глубина 1), на верх можно встать.
  r.furniture.set(TABLE, {
    name: 'Стол',
    size: [2, 1, 1],
    mount: 'floor',
    cells: { '0,0,0': 'stand', '1,0,0': 'stand' },
    voxels: null,
    positions: [],
    container: null,
    usable: true,
  });
  r.furniture.set(PAINTING, {
    name: 'Картина',
    size: [1, 1, 1],
    mount: 'wall',
    cells: {},
    voxels: null,
    positions: [],
    container: null,
    usable: true,
  });
  r.furniture.set(LAMP, {
    name: 'Люстра',
    size: [1, 1, 1],
    mount: 'ceiling',
    cells: {},
    voxels: null,
    positions: [],
    container: null,
    usable: true,
  });
  r.furniture.set(FOREIGN, {
    name: 'Чужая',
    size: [1, 1, 1],
    mount: 'floor',
    cells: {},
    voxels: null,
    positions: [],
    container: null,
    usable: false,
  });
  // Ворота в проёме (этап 8г): закрытые — 1×1×1, открытые — створка уходит в соседнюю
  // клетку на восток, 2×1×1.
  const closed = { size: [1, 1, 1] as const, cells: {}, voxels: null };
  r.furniture.set(GATE, {
    name: 'Ворота',
    mount: 'doorway',
    ...closed,
    size: [1, 1, 1],
    positions: [
      { name: 'Закрыты', ...closed, size: [1, 1, 1] },
      { name: 'Открыты', size: [2, 1, 1], cells: {}, voxels: null },
    ],
    container: null,
    usable: true,
  });
  // Сундук-обстановка на 2 фнт. (этап 11) и монета в 0,5 фнт.
  r.furniture.set(CHEST, {
    name: 'Сундук',
    mount: 'floor',
    size: [1, 1, 1],
    cells: {},
    voxels: null,
    positions: [],
    container: { capacity: 2, lockDc: 15 },
    usable: true,
  });
  r.items.set(GOLD, 0.5);
  return r;
}

// Карта с полом из камня на y = 0 по всей площади 6×6.
function floorMap(): EditableMap & {
  objects: NonNullable<EditableMap['objects']>;
} {
  const map = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 6, depth: 6 },
    objects: createMapObjects(),
  };
  editMap(
    map,
    [{ op: 'fillBox', from: [0, 0, 0], to: [5, 0, 5], block: 'stone' }],
    limits,
  );
  return map;
}

const edit = (map: EditableMap, ops: MapOp[]) =>
  editMap(map, ops, limits, { refs: refs() });

const place = (
  at: [number, number, number],
  furnitureId: string,
  extra: object = {},
  force?: true,
) =>
  ({
    op: 'placeObject',
    at,
    // facing по умолчанию ставит разбор операции; здесь операции собраны вручную.
    object: { kind: 'furniture', furnitureId, facing: 0, ...extra },
    ...(force && { force }),
  }) as MapOp;

describe('поворот клеток модели', () => {
  it('по часовой: север модели уходит на восток', () => {
    const size = [2, 1, 3] as const;
    expect(rotateModelCell([0, 0, 0], size, 0)).toEqual([0, 0, 0]);
    expect(rotateModelCell([0, 0, 0], size, 90)).toEqual([2, 0, 0]);
    expect(rotateModelCell([0, 0, 0], size, 180)).toEqual([1, 0, 2]);
    expect(rotateModelCell([0, 0, 0], size, 270)).toEqual([0, 0, 1]);
  });
});

describe('обстановка на карте', () => {
  it('стол на полу; повёрнутый на 90° занимает клетки по глубине', () => {
    const map = floorMap();
    edit(map, [place([1, 1, 1], TABLE)]);
    const table = map.objects.byId.get(1)!;
    expect(objectBox(table, refs())).toEqual({
      min: [1, 1, 1],
      max: [2, 1, 1],
    });
    edit(map, [{ op: 'turnObject', id: 1, facing: 90 }]);
    expect(objectBox(map.objects.byId.get(1)!, refs()).max).toEqual([1, 1, 2]);
  });

  it('поворот на 45° и чужая обстановка — отказ', () => {
    const map = floorMap();
    expect(() => edit(map, [place([1, 1, 1], TABLE, { facing: 45 })])).toThrow(
      /только на 90°/,
    );
    expect(() => edit(map, [place([1, 1, 1], FOREIGN)])).toThrow(
      /скопируйте себе/,
    );
  });

  it('мешают блок и объект в клетках; с force — ставится', () => {
    const map = floorMap();
    edit(map, [{ op: 'setBlock', at: [2, 1, 1], block: 'stone' }]);
    expect(() => edit(map, [place([1, 1, 1], TABLE)])).toThrow(
      /мешает блок в клетке \[2, 1, 1\]/,
    );
    edit(map, [place([1, 1, 3], TABLE)]);
    expect(() => edit(map, [place([2, 1, 3], TABLE)])).toThrow(
      /мешает объект #1/,
    );
    edit(map, [place([1, 1, 1], TABLE, {}, true)]);
    expect(map.objects.byId.size).toBe(2);
  });

  it('на полу нужна опора под каждой клеткой — блок или верх стола', () => {
    const map = floorMap();
    expect(() => edit(map, [place([4, 2, 4], TABLE)])).toThrow(/нужна опора/);
    edit(map, [place([1, 1, 1], TABLE)]);
    // Лампа на полу не бывает — ставим «стол» на стол: верх стола — опора.
    edit(map, [place([1, 2, 1], TABLE)]);
    expect(map.objects.byId.size).toBe(2);
  });

  it('картина — блок за спиной; люстра — блок над ней', () => {
    const map = floorMap();
    // Спина картины, смотрящей на север, — юг (+z).
    expect(() => edit(map, [place([2, 1, 2], PAINTING)])).toThrow(/за спиной/);
    edit(map, [{ op: 'setBlock', at: [2, 1, 3], block: 'stone' }]);
    edit(map, [place([2, 1, 2], PAINTING)]);
    expect(() => edit(map, [place([4, 1, 4], LAMP)])).toThrow(
      /на потолке нужен блок/,
    );
    edit(map, [{ op: 'setBlock', at: [4, 2, 4], block: 'stone' }]);
    edit(map, [place([4, 1, 4], LAMP)]);
    expect(map.objects.byId.size).toBe(2);
  });

  it('за границей карты — отказ по всем клеткам модели', () => {
    const map = floorMap();
    expect(() => edit(map, [place([5, 1, 1], TABLE)])).toThrow();
  });
});

describe('кисть и заливка мимо обстановки (этап 8в2)', () => {
  it('заливка обходит клетки стола, стирание их не обходит', () => {
    const map = floorMap();
    edit(map, [place([1, 1, 1], TABLE)]);
    edit(map, [
      { op: 'fillBox', from: [0, 1, 0], to: [3, 1, 3], block: 'stone' },
    ]);
    expect(readCell(map.store, [1, 1, 1])).toBe(0);
    expect(readCell(map.store, [2, 1, 1])).toBe(0);
    expect(readCell(map.store, [3, 1, 1])).not.toBe(0);
    edit(map, [
      { op: 'fillBox', from: [0, 1, 0], to: [3, 1, 3], block: 'air' },
    ]);
    expect(readCell(map.store, [3, 1, 1])).toBe(0);
  });

  it('одиночный блок в клетку обстановки — отказ с её именем', () => {
    const map = floorMap();
    edit(map, [place([1, 1, 1], TABLE)]);
    expect(() =>
      edit(map, [{ op: 'setBlock', at: [2, 1, 1], block: 'stone' }]),
    ).toThrow('стоит обстановка «Стол»');
    edit(map, [{ op: 'setBlock', at: [2, 1, 1], block: 'air' }]);
  });
});

describe('положения двери (этап 8г)', () => {
  const open = (id: number, position: number, force?: true) =>
    ({ op: 'setPosition', id, position, ...(force && { force }) }) as MapOp;

  it('открытые ворота занимают клетки своей модели, закрытые — снова одну', () => {
    const map = floorMap();
    edit(map, [place([1, 1, 1], GATE)]);
    edit(map, [open(1, 1)]);
    const gate = map.objects.byId.get(1)!;
    expect(gate).toMatchObject({ position: 1 });
    expect(objectBox(gate, refs())).toEqual({ min: [1, 1, 1], max: [2, 1, 1] });
    edit(map, [open(1, 0)]);
    expect(objectBox(map.objects.byId.get(1)!, refs()).max).toEqual([1, 1, 1]);
  });

  it('створка упёрлась в блок — отказ с названием положения; с force — открывается', () => {
    const map = floorMap();
    edit(map, [
      place([1, 1, 1], GATE),
      { op: 'setBlock', at: [2, 1, 1], block: 'stone' },
    ]);
    expect(() => edit(map, [open(1, 1)])).toThrow(
      /«Ворота»: положение «Открыты» не поставить — .*мешает/,
    );
    edit(map, [open(1, 1, true)]);
    expect(map.objects.byId.get(1)).toMatchObject({ position: 1 });
  });

  it('нет такого положения или положений вовсе — отказ', () => {
    const map = floorMap();
    edit(map, [place([1, 1, 1], GATE), place([1, 1, 3], TABLE)]);
    expect(() => edit(map, [open(1, 2)])).toThrow(/положения от 0 до 1/);
    expect(() => edit(map, [open(2, 1)])).toThrow(/нет положений/);
  });

  it('«заперта» ставится при постановке и правкой', () => {
    const map = floorMap();
    edit(map, [place([1, 1, 1], GATE, { locked: true })]);
    expect(map.objects.byId.get(1)).toMatchObject({ locked: true });
    edit(map, [{ op: 'updateObject', id: 1, object: { locked: false } }]);
    expect(map.objects.byId.get(1)).toMatchObject({ locked: false });
  });
});

describe('контейнер-обстановка на карте (этап 11)', () => {
  const coins = (quantity: number) => [{ itemId: GOLD, quantity }];

  it('ставится с названием и содержимым, груз — по вместимости записи', () => {
    const map = floorMap();
    edit(map, [
      place([1, 1, 1], CHEST, { name: 'Сундук казначея', items: coins(4) }),
    ]);
    expect(map.objects.byId.get(1)).toMatchObject({
      name: 'Сундук казначея',
      items: coins(4),
    });
    expect(() =>
      edit(map, [{ op: 'updateObject', id: 1, object: { items: coins(5) } }]),
    ).toThrow(/Не влезет в «Сундук казначея»: 2,5 из 2/);
  });

  it('у обычной обстановки содержимого нет', () => {
    const map = floorMap();
    expect(() =>
      edit(map, [place([1, 1, 1], TABLE, { items: coins(1) })]),
    ).toThrow(/не контейнер/);
  });
});
