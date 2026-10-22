import {
  applyOps,
  boxVolume,
  createPalette,
  MemoryChunkStore,
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
  wallBox,
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

describe('wallBox', () => {
  it('прижимает второй конец к оси, вдоль которой курсор ушёл дальше', () => {
    expect(wallBox([2, 0, 3], [7, 2, 4], 2)).toEqual({
      min: [2, 0, 3],
      max: [7, 2, 3],
    });
    expect(wallBox([2, 1, 3], [3, 1, 9], 5)).toEqual({
      min: [2, 1, 3],
      max: [2, 5, 9],
    });
  });

  it('стирает от нижнего клика до верха постройки, а не до верхнего клика', () => {
    expect(wallBox([1, 1, 5], [6, 1, 5], 4).max[1]).toBe(4);
  });

  it('стена одна и та же, с какого конца ни начать', () => {
    expect(wallBox([1, 0, 5], [6, 3, 5], 6)).toEqual(
      wallBox([6, 3, 5], [1, 0, 5], 6),
    );
  });
});

describe('connectedCells', () => {
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
    expect(nextEraseMode('block')).toBe('wall');
    expect(nextEraseMode('connected')).toBe('block');
  });
});
