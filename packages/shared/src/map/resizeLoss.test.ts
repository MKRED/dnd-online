import { describe, expect, it } from 'vitest';
import { applyResize } from './applyResize.js';
import { MemoryChunkStore } from './chunkStore.js';
import type { SizedMapState } from './mapSize.js';
import { applyOps } from './opsBatch.js';
import { createPalette } from './palette.js';
import { resizeLoss } from './resizeLoss.js';
import type { ResizeOp } from './resizeOp.js';
import { solidCells } from './summary.js';

// Карта 8 × 6: камень в [0, 0, 0], дерево в [7, 2, 5] и скрытый прошлым сужением
// кирпич за восточной границей, в [9, 0, 0].
function cornerMap(): SizedMapState {
  const map: SizedMapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 8, depth: 6 },
  };
  applyOps(map, [
    { op: 'setBlock', at: [0, 0, 0], block: 'stone' },
    { op: 'setBlock', at: [7, 2, 5], block: 'wood' },
    { op: 'setBlock', at: [9, 0, 0], block: 'brick' },
  ]);
  return map;
}

const countBlocks = (map: SizedMapState) => [...solidCells(map.store)].length;

describe('resizeLoss', () => {
  it('рост ничего не теряет; скрытое раньше остаётся за границей', () => {
    expect(resizeLoss(cornerMap(), { grow: { down: 2, west: 1 } })).toEqual({
      cut: 0,
      outside: 1,
      top: 4,
      objectsCut: 0,
      objectsOutside: 0,
    });
  });

  it('срезанное с запада и снизу считается удалённым при любом cut', () => {
    const map = cornerMap();
    // Кирпич за границей тоже уходит вниз, под землю, — и срезается.
    expect(resizeLoss(map, { grow: { west: -1, down: -1 } })).toEqual({
      cut: 2,
      outside: 0,
      top: 1,
      objectsCut: 0,
      objectsOutside: 0,
    });
  });

  it('при cut «delete» за границей не остаётся ничего, и высота считается без него', () => {
    const map = cornerMap();
    expect(resizeLoss(map, { grow: { east: -1 }, cut: 'delete' })).toEqual({
      cut: 0,
      outside: 2,
      top: 0,
      objectsCut: 0,
      objectsOutside: 0,
    });
    expect(resizeLoss(map, { grow: { east: -1 } }).top).toBe(2);
  });

  it('совпадает с тем, что делает applyResize', () => {
    const cases: Pick<ResizeOp, 'grow' | 'cut'>[] = [
      { grow: { west: -1, south: -1 }, cut: 'delete' },
      { grow: { north: -2, east: -1 } },
      { grow: { down: -1, east: -3 }, cut: 'delete' },
    ];
    for (const op of cases) {
      const map = cornerMap();
      const before = countBlocks(map);
      const loss = resizeLoss(map, op);
      applyResize(map, { op: 'resize', ...op }, { maxSize: 64, maxHeight: 16 });
      const removed = loss.cut + (op.cut === 'delete' ? loss.outside : 0);
      expect(countBlocks(map)).toBe(before - removed);
    }
  });
});
