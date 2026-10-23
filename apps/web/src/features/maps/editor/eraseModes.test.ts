import {
  applyOps,
  boxVolume,
  createBlockCatalog,
  createPalette,
  MemoryChunkStore,
  type BlockGroupInfo,
  type BlockOp,
  type SizedMapState,
  type Vec3,
} from 'shared';
import { describe, expect, it } from 'vitest';
import {
  connectedCells,
  connectedEraseOps,
  CONNECTED_LIMIT,
  MAX_ERASE_BOXES,
  nextEraseMode,
  packBoxes,
  planeBox,
} from './eraseModes';

function map(ops: BlockOp[], width = 20): SizedMapState {
  const state: SizedMapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width, depth: width },
  };
  applyOps(state, ops);
  return state;
}

const sortCells = (cells: Vec3[]) =>
  cells.map((c) => c.join(',')).sort((a, b) => a.localeCompare(b));

describe('planeBox', () => {
  it('стена 3 × 4 — ровно прямоугольник между противоположными углами', () => {
    expect(planeBox([2, 1, 3], [4, 4, 3])).toEqual({
      min: [2, 1, 3],
      max: [4, 4, 3],
    });
  });

  it('пол — прямоугольник на одном уровне', () => {
    expect(planeBox([1, 2, 1], [4, 2, 3])).toEqual({
      min: [1, 2, 1],
      max: [4, 2, 3],
    });
  });

  it('косой клик: толщину получает ось, вдоль которой клики ближе всего', () => {
    // По z разошлись на 1 — это стена вдоль x.
    expect(planeBox([2, 0, 3], [7, 2, 4])).toEqual({
      min: [2, 0, 3],
      max: [7, 2, 3],
    });
    // По y разошлись на 1 — это пол на уровне первого клика.
    expect(planeBox([0, 2, 0], [5, 3, 4])).toEqual({
      min: [0, 2, 0],
      max: [5, 2, 4],
    });
  });

  it('плоскость одна и та же, с какого угла ни начать', () => {
    expect(planeBox([1, 0, 5], [6, 3, 5])).toEqual(
      planeBox([6, 3, 5], [1, 0, 5]),
    );
  });
});

describe('connectedCells', () => {
  it('своя группа — один материал во всех формах, другая группа — нет', () => {
    const group = (id: string): BlockGroupInfo => ({
      id,
      name: id,
      look: 'stone',
      color: '#808080',
      opaque: true,
      durability: null,
      flammable: false,
      movementCost: 1,
      climbable: false,
      hazard: null,
      textures: null,
      shapes: {},
    });
    const a = '0b5c6f2e-8a1d-4c3b-9e7f-1a2b3c4d5e6f';
    const b = '11111111-2222-4333-8444-555555555555';
    const state: SizedMapState = {
      store: new MemoryChunkStore(),
      palette: createPalette(),
      size: { width: 20, depth: 20 },
      blocks: createBlockCatalog([group(a), group(b)]),
    };
    applyOps(state, [
      { op: 'setBlock', at: [0, 0, 0], block: a },
      { op: 'setBlock', at: [1, 0, 0], block: `${a}_stairs` },
      { op: 'setBlock', at: [2, 0, 0], block: b },
    ]);
    expect(sortCells(connectedCells(state, [0, 0, 0]) ?? [])).toEqual(
      sortCells([
        [0, 0, 0],
        [1, 0, 0],
      ]),
    );
  });

  it('берёт соединённые блоки того же материала, ступени и плиты тоже', () => {
    const state = map([
      { op: 'fillBox', from: [0, 0, 0], to: [2, 0, 0], block: 'stone' },
      { op: 'setBlock', at: [2, 1, 0], block: 'stone_stairs' },
      // Кирпич рядом — другой материал, камень за ним — уже не соединён.
      { op: 'setBlock', at: [3, 0, 0], block: 'brick' },
      { op: 'setBlock', at: [4, 0, 0], block: 'stone' },
    ]);
    expect(sortCells(connectedCells(state, [0, 0, 0]) ?? [])).toEqual(
      sortCells([
        [0, 0, 0],
        [1, 0, 0],
        [2, 0, 0],
        [2, 1, 0],
      ]),
    );
  });

  it('по воздуху — ничего', () => {
    expect(connectedCells(map([]), [1, 1, 1])).toBeNull();
  });

  it('постройка больше предела — null', () => {
    const side = Math.ceil(Math.sqrt(CONNECTED_LIMIT)) + 1;
    const state = map(
      [
        {
          op: 'fillBox',
          from: [0, 0, 0],
          to: [side - 1, 0, side - 1],
          block: 'grass',
        },
      ],
      side,
    );
    expect(connectedCells(state, [0, 0, 0])).toBeNull();
  });
});

describe('packBoxes', () => {
  it('сплошной брус — одна коробка', () => {
    const cells: Vec3[] = [];
    for (let y = 0; y < 3; y++)
      for (let z = 0; z < 2; z++)
        for (let x = 0; x < 4; x++) cells.push([x, y, z]);
    expect(packBoxes(cells)).toEqual([{ min: [0, 0, 0], max: [3, 2, 1] }]);
  });

  it('коробки покрывают ровно эти клетки, без лишних', () => {
    const cells: Vec3[] = [
      [0, 0, 0],
      [1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
      [5, 2, 5],
    ];
    const boxes = packBoxes(cells);
    expect(boxes.reduce((sum, box) => sum + boxVolume(box), 0)).toBe(
      cells.length,
    );
  });
});

describe('connectedEraseOps', () => {
  it('стирает связную стену и не трогает соседний материал', () => {
    const state = map([
      { op: 'fillBox', from: [0, 0, 0], to: [5, 2, 0], block: 'stone' },
      { op: 'setBlock', at: [6, 0, 0], block: 'wood' },
    ]);
    const ops = connectedEraseOps(state, [3, 1, 0]);
    expect(ops).toEqual([
      { op: 'fillBox', from: [0, 0, 0], to: [5, 2, 0], block: 'air' },
    ]);
    applyOps(state, ops as BlockOp[]);
    expect(connectedCells(state, [6, 0, 0])).toEqual([[6, 0, 0]]);
  });

  it('слишком сложная постройка — текст вместо операций', () => {
    // Гребёнка: ряд камня и зубцы через клетку — каждый зубец своя коробка.
    const teeth = MAX_ERASE_BOXES + 1;
    const ops: BlockOp[] = [
      { op: 'fillBox', from: [0, 0, 0], to: [teeth * 2, 0, 0], block: 'stone' },
    ];
    for (let i = 0; i < teeth; i++) {
      ops.push({ op: 'setBlock', at: [i * 2, 1, 0], block: 'stone' });
    }
    const state = map(ops, teeth * 2 + 1);
    expect(typeof connectedEraseOps(state, [0, 0, 0])).toBe('string');
  });
});

describe('nextEraseMode', () => {
  it('идёт по кругу', () => {
    expect(nextEraseMode('block')).toBe('plane');
    expect(nextEraseMode('connected')).toBe('block');
  });
});
