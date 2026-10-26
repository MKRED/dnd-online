import { describe, expect, it } from 'vitest';
import { builtinContainerModel } from '../../../voxelModel/builtinContainers.js';
import { bytesToBase64, encodeVoxels } from '../../../voxelModel/voxelCodec.js';
import {
  modelVoxelCount,
  modelVoxelSize,
  voxelIndex,
  type ModelCellKind,
} from '../../../voxelModel/voxelModel.js';
import type { FurnitureMount } from '../../../voxelModel/furniture.js';
import { applyOp } from '../../applyOp.js';
import { MemoryChunkStore } from '../../chunkStore.js';
import type { Vec3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import type { Facing, MapObject } from '../../objects/mapObject.js';
import { emptyObjectRefs, type ObjectRefs } from '../../objects/objectRefs.js';
import { createPalette } from '../../palette.js';
import { attackCover } from '../cover.js';
import { maskHas } from '../vision/cellMask.js';
import { partySight } from '../vision/index.js';
import { creatureBody } from '../creature.js';
import { findPath } from '../path/index.js';
import { segmentBlocked } from '../segment.js';
import { standHeight } from '../standing.js';
import { stepCost } from '../step.js';
import { buildFurnitureLayer } from './furnitureLayer.js';
import { modelCellShapes } from './modelCellShapes.js';

// Обстановка в правилах (docs/plan/blocks.md, этап 8в2): путь по клеткам, опора у «можно
// встать сверху», лучи обзора и укрытия — по вокселям.

type Fill = (x: number, y: number, z: number) => boolean;

function voxels(size: Vec3, fill: Fill): string {
  const dims = modelVoxelSize(size);
  const data = new Uint8Array(modelVoxelCount(size));
  for (let y = 0; y < dims[1]; y++)
    for (let z = 0; z < dims[2]; z++)
      for (let x = 0; x < dims[0]; x++)
        if (fill(x, y, z)) data[voxelIndex(dims, x, y, z)] = 1;
  return bytesToBase64(encodeVoxels(data));
}

// Стол в клетку: столешница на высоте 10–12 вокселей и четыре ножки 2×2 по углам.
const table: Fill = (x, y, z) =>
  (y >= 10 && y < 12) || (y < 10 && (x < 2 || x >= 14) && (z < 2 || z >= 14));

// Створка двери поперёк клетки: 2 вокселя толщиной посередине по z.
const doorLeaf: Fill = (_x, _y, z) => z >= 7 && z < 9;

const MODELS: Record<
  string,
  {
    size: Vec3;
    fill: Fill;
    cells?: Record<string, ModelCellKind>;
    mount?: FurnitureMount;
  }
> = {
  table: { size: [1, 1, 1], fill: table, cells: { '0,0,0': 'stand' } },
  crate: { size: [1, 1, 1], fill: () => true },
  bush: {
    size: [1, 1, 1],
    fill: (_x, y) => y < 8,
    cells: { '0,0,0': 'difficult' },
  },
  // Картина у южной (задней) грани.
  painting: {
    size: [1, 1, 1],
    fill: (_x, y, z) => z === 15 && y >= 4,
    mount: 'wall',
  },
  // Скамья 2×1×1: левая клетка — сиденье во всю клетку, правая пустая.
  bench: { size: [2, 1, 1], fill: (x, y) => x < 16 && y < 8 },
};

function refsFor(): ObjectRefs {
  const refs = emptyObjectRefs();
  for (const [id, model] of Object.entries(MODELS))
    refs.furniture.set(id, {
      name: id,
      size: model.size,
      mount: model.mount ?? 'floor',
      cells: model.cells ?? {},
      voxels: voxels(model.size, model.fill),
      positions: [],
      container: null,
      usable: true,
    });
  // Дверь в проёме (этап 8г): закрытая — створка поперёк клетки, открытая — у западной
  // грани той же клетки, клетка помечена «свободно».
  const closed = {
    size: [1, 2, 1] as Vec3,
    cells: {},
    voxels: voxels([1, 2, 1], doorLeaf),
  };
  const open = {
    size: [1, 2, 1] as Vec3,
    cells: { '0,0,0': 'free', '0,1,0': 'free' } as Record<
      string,
      ModelCellKind
    >,
    voxels: voxels([1, 2, 1], (x) => x < 2),
  };
  refs.furniture.set('door', {
    name: 'Дверь',
    mount: 'doorway',
    ...closed,
    positions: [
      { name: 'Закрыта', ...closed },
      { name: 'Открыта', ...open },
    ],
    container: null,
    usable: true,
  });
  return refs;
}

function piece(
  id: number,
  furnitureId: string,
  at: Vec3,
  facing: Facing = 0,
): MapObject {
  return {
    id,
    kind: 'furniture',
    at,
    furnitureId,
    facing,
    hidden: false,
  } as MapObject;
}

// Каменный пол 8×8 на y = 0, существа стоят на y = 1.
function room(...objects: MapObject[]): MapState {
  const map: MapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
  };
  applyOp(map, {
    op: 'fillBox',
    from: [0, 0, 0],
    to: [7, 0, 7],
    block: 'stone',
  });
  map.furniture = buildFurnitureLayer(objects, refsFor());
  return map;
}

describe('modelCellShapes', () => {
  it('коробки покрывают ровно воксели, верх — по самому высокому вокселю', () => {
    const [cell] = modelCellShapes([1, 1, 1], voxels([1, 1, 1], table), 0)!;
    const volume = cell.boxes.reduce(
      (sum, [x0, y0, z0, x1, y1, z1]) =>
        sum + (x1 - x0) * (y1 - y0) * (z1 - z0) * 16 ** 3,
      0,
    );
    // Столешница 16×2×16 и четыре ножки 2×10×2.
    expect(volume).toBe(16 * 2 * 16 + 4 * 2 * 10 * 2);
    expect(cell.boxes.length).toBeLessThanOrEqual(8);
    expect(cell.top).toBe(0.75);
  });

  it('поворот на 90° переносит и клетку, и воксели внутри неё', () => {
    const shapes = modelCellShapes(
      [2, 1, 1],
      voxels([2, 1, 1], MODELS.bench.fill),
      90,
    )!;
    // Сиденье (клетка модели [0, 0, 0]) после поворота по часовой — в [0, 0, 0]
    // повёрнутого места 1×1×2, пустая клетка в слой не попадает.
    expect(shapes.map((s) => s.offset)).toEqual([[0, 0, 0]]);
    // Картина у задней (южной) грани после поворота на 90° — у западной.
    const [back] = modelCellShapes(
      [1, 1, 1],
      voxels([1, 1, 1], MODELS.painting.fill),
      90,
    )!;
    expect(back.boxes[0][0]).toBe(0);
    expect(back.boxes[0][3]).toBe(1 / 16);
  });
});

describe('обстановка в пути и опоре', () => {
  it('ящик — препятствие: в его клетке не стоят, путь его обходит', () => {
    const map = room(piece(1, 'crate', [3, 1, 3]));
    expect(standHeight(map, [3, 1, 3], 'medium')).toBeNull();
    const path = findPath(map, [2, 1, 3], [4, 1, 3], 'medium');
    expect(path?.path).not.toContainEqual([3, 1, 3]);
    // Углы не срезаются: в обход через соседний ряд — четыре шага.
    expect(path?.path.length).toBe(5);
    // Без слоя обстановки — прямо сквозь ящик.
    const bare = room();
    expect(standHeight(bare, [3, 1, 3], 'medium')).toBe(1);
  });

  it('на стол с «можно встать сверху» встают на верх столешницы', () => {
    const map = room(piece(1, 'table', [3, 1, 3]));
    expect(standHeight(map, [3, 1, 3], 'medium')).toBe(1.75);
    expect(creatureBody(map, [3, 1, 3], 'medium').min[1]).toBe(1.75);
  });

  it('кусты — труднопроходимо: шаг в них стоит вдвое', () => {
    const map = room(piece(1, 'bush', [3, 1, 3]));
    expect(stepCost(map, [2, 1, 3], [3, 1, 3], 'medium')).toBe(10);
    expect(stepCost(map, [3, 1, 3], [4, 1, 3], 'medium')).toBe(5);
  });

  it('картина на стене клеток для пути не занимает', () => {
    const map = room(piece(1, 'painting', [3, 1, 3]));
    expect(standHeight(map, [3, 1, 3], 'medium')).toBe(1);
  });
});

describe('обстановка в обзоре и укрытии', () => {
  it('луч проходит между ножками стола и упирается в столешницу', () => {
    const map = room(piece(1, 'table', [3, 1, 3]));
    expect(segmentBlocked(map, [2.5, 1.3, 3.5], [4.5, 1.3, 3.5], 'sight')).toBe(
      false,
    );
    expect(segmentBlocked(map, [2.5, 1.7, 3.5], [4.5, 1.7, 3.5], 'sight')).toBe(
      true,
    );
  });

  it('ящик укрывает так же, как каменный блок на его месте', () => {
    const map = room(piece(1, 'crate', [3, 1, 3]));
    const stone = room();
    applyOp(stone, { op: 'setBlock', at: [3, 1, 3], block: 'stone' });
    const attacker = creatureBody(map, [0, 1, 3], 'medium');
    const target = creatureBody(map, [4, 1, 3], 'medium');
    const cover = attackCover(map, attacker, target, 'effect');
    expect(cover).toBe(attackCover(stone, attacker, target, 'effect'));
    expect(cover).not.toBe('none');
    expect(attackCover(room(), attacker, target, 'effect')).toBe('none');
  });
});

describe('дверь в проёме (этап 8г)', () => {
  const door = (position: number) =>
    ({ ...piece(1, 'door', [3, 1, 3]), position }) as MapObject;

  it('закрытая — препятствие и закрывает вид; открытая — проход и вид у створки', () => {
    const closed = room(door(0));
    expect(standHeight(closed, [3, 1, 3], 'medium')).toBeNull();
    expect(
      segmentBlocked(closed, [3.5, 1.5, 1.5], [3.5, 1.5, 5.5], 'sight'),
    ).toBe(true);

    const open = room(door(1));
    expect(standHeight(open, [3, 1, 3], 'medium')).toBe(1);
    expect(findPath(open, [3, 1, 2], [3, 1, 4], 'medium')?.path).toContainEqual(
      [3, 1, 3],
    );
    expect(
      segmentBlocked(open, [3.5, 1.5, 1.5], [3.5, 1.5, 5.5], 'sight'),
    ).toBe(false);
  });

  it('туман: за закрытой дверью в стене не видно, за открытой — видно', () => {
    const walled = (position: number) => {
      const map = room(door(position));
      for (const x of [0, 1, 2, 4, 5, 6, 7])
        applyOp(map, {
          op: 'fillBox',
          from: [x, 1, 3],
          to: [x, 2, 3],
          block: 'stone',
        });
      return map;
    };
    const bounds = { min: [0, 0, 0], max: [7, 4, 7] } as const;
    const seen = (map: MapState) =>
      partySight(
        map,
        [{ body: creatureBody(map, [3, 1, 1], 'medium'), rangeCells: 12 }],
        [],
        bounds,
      );
    expect(maskHas(seen(walled(0)), [3, 0, 6])).toBe(false);
    expect(maskHas(seen(walled(1)), [3, 0, 6])).toBe(true);
  });

  it('положения нет в записи — вид первого', () => {
    expect(standHeight(room(door(5)), [3, 1, 3], 'medium')).toBeNull();
  });
});

describe('встроенные контейнеры в правилах (этап 11)', () => {
  const container = (look: 'chest' | 'barrel' | 'crate' | 'sack') =>
    ({
      id: 1,
      kind: 'container',
      at: [3, 1, 3],
      name: look,
      look,
      items: [],
      facing: 45,
      hidden: false,
    }) as MapObject;

  it('на сундук, бочку и ящик встают сверху', () => {
    for (const look of ['chest', 'barrel', 'crate'] as const) {
      const height = standHeight(room(container(look)), [3, 1, 3], 'medium');
      expect(height).toBeGreaterThan(1.4);
      expect(height).toBeLessThan(2);
    }
  });

  it('мешок — труднопроходимая клетка', () => {
    const map = room(container('sack'));
    expect(stepCost(map, [2, 1, 3], [3, 1, 3], 'medium')).toBe(10);
  });

  it('туман: видно клетку контейнера и пол под ним', () => {
    for (const look of ['chest', 'barrel', 'crate', 'sack'] as const) {
      const map = room(container(look));
      const seen = partySight(
        map,
        [{ body: creatureBody(map, [1, 1, 1], 'medium'), rangeCells: 12 }],
        [],
        { min: [0, 0, 0], max: [7, 4, 7] },
      );
      expect(maskHas(seen, [3, 1, 3])).toBe(true);
      expect(maskHas(seen, [3, 0, 3])).toBe(true);
    }
  });

  it('модели встроенных — в пределах клетки', () => {
    for (const look of ['chest', 'barrel', 'crate', 'sack'] as const) {
      const { size, voxels } = builtinContainerModel(look);
      expect(size).toEqual([1, 1, 1]);
      expect(modelCellShapes(size, voxels, 0)?.length).toBe(1);
    }
  });
});
