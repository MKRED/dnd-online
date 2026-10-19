import { describe, expect, it } from 'vitest';
import { applyResize } from './applyResize.js';
import { cellTypeId } from './cell.js';
import { MemoryChunkStore, readCell } from './chunkStore.js';
import type { Vec3 } from './coords.js';
import type { SizedMapState } from './mapSize.js';
import { MapOpError } from './ops.js';
import { applyOps } from './opsBatch.js';
import { createPalette } from './palette.js';
import { mapBounds } from './summary.js';

const limits = { maxSize: 64, maxHeight: 16 };

// Карта 8 × 6 с камнем в [0, 0, 0] и деревом в [7, 2, 5] — по углам.
function cornerMap(): SizedMapState {
  const map: SizedMapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 8, depth: 6 },
  };
  applyOps(map, [
    { op: 'setBlock', at: [0, 0, 0], block: 'stone' },
    { op: 'setBlock', at: [7, 2, 5], block: 'wood' },
  ]);
  return map;
}

const blockAt = (map: SizedMapState, at: Vec3) =>
  map.palette[cellTypeId(readCell(map.store, at))];

describe('applyResize', () => {
  it('рост на восток и юг меняет только размер', () => {
    const map = cornerMap();
    const changes = applyResize(
      map,
      { op: 'resize', grow: { east: 4, south: 2 } },
      limits,
    );
    expect(map.size).toEqual({ width: 12, depth: 8 });
    expect(changes.cells).toEqual([]);
    expect(changes.size).toEqual({
      before: { width: 8, depth: 6 },
      after: { width: 12, depth: 8 },
    });
  });

  it('рост на запад, север и вниз сдвигает все блоки', () => {
    const map = cornerMap();
    applyResize(
      map,
      { op: 'resize', grow: { west: 3, north: 1, down: 2 } },
      limits,
    );
    expect(map.size).toEqual({ width: 11, depth: 7 });
    expect(blockAt(map, [3, 2, 1])).toBe('stone');
    expect(blockAt(map, [10, 4, 6])).toBe('wood');
    expect(blockAt(map, [0, 0, 0])).toBe('air');
  });

  it('сужение с запада, севера и снизу удаляет срезанное всегда', () => {
    const map = cornerMap();
    applyResize(
      map,
      { op: 'resize', grow: { west: -1, down: -1 }, cut: 'keep' },
      limits,
    );
    expect(map.size).toEqual({ width: 7, depth: 6 });
    // Камень на уровне 0 срезан снизу (и с запада), дерево сдвинулось.
    expect(mapBounds(map.store)).toEqual({ min: [6, 1, 5], max: [6, 1, 5] });
  });

  it('сужение с востока скрывает блоки или удаляет — по cut', () => {
    const kept = cornerMap();
    applyResize(kept, { op: 'resize', grow: { east: -1 } }, limits);
    expect(kept.size.width).toBe(7);
    expect(blockAt(kept, [7, 2, 5])).toBe('wood');

    // Скрытый блок возвращается, когда карту снова расширяют.
    applyResize(kept, { op: 'resize', grow: { east: 1 } }, limits);
    expect(blockAt(kept, [7, 2, 5])).toBe('wood');

    const deleted = cornerMap();
    applyResize(
      deleted,
      { op: 'resize', grow: { south: -1 }, cut: 'delete' },
      limits,
    );
    expect(blockAt(deleted, [7, 2, 5])).toBe('air');
    expect(blockAt(deleted, [0, 0, 0])).toBe('stone');
  });

  it('сдвиг на клетку внутри занятого места не теряет блоки', () => {
    const map = cornerMap();
    applyOps(map, [
      { op: 'fillBox', from: [0, 0, 1], to: [3, 0, 1], block: 'dirt' },
    ]);
    applyResize(map, { op: 'resize', grow: { west: 1 } }, limits);
    expect([1, 2, 3, 4].map((x) => blockAt(map, [x, 0, 1]))).toEqual([
      'dirt',
      'dirt',
      'dirt',
      'dirt',
    ]);
    expect(blockAt(map, [0, 0, 1])).toBe('air');
  });

  it.each([
    ['меньше одной клетки', { west: -8 }, 'хотя бы одна клетка'],
    ['больше предела', { east: 60 }, 'больше предела 64 × 64'],
    ['блоки выше предела высоты', { down: 14 }, 'предела высоты'],
  ])('отклоняет: %s', (_, grow, message) => {
    const run = () => applyResize(cornerMap(), { op: 'resize', grow }, limits);
    expect(run).toThrow(MapOpError);
    expect(run).toThrow(message);
  });
});
