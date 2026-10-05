import { describe, expect, it } from 'vitest';
import { applyOp } from '../applyOp.js';
import { MemoryChunkStore } from '../chunkStore.js';
import type { MapState } from '../mapState.js';
import type { MapOp } from '../ops.js';
import { createPalette } from '../palette.js';
import { segmentBlocked } from './segment.js';

function mapWith(...ops: MapOp[]): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  for (const op of ops) applyOp(map, op);
  return map;
}

describe('segmentBlocked', () => {
  const wall = mapWith({ op: 'setBlock', at: [3, 0, 0], block: 'stone' });

  it('луч вдоль оси упирается в блок и не зацикливается', () => {
    expect(
      segmentBlocked(wall, [0.5, 0.5, 0.5], [6.5, 0.5, 0.5], 'effect'),
    ).toBe(true);
    expect(
      segmentBlocked(wall, [0.5, 1.5, 0.5], [6.5, 1.5, 0.5], 'effect'),
    ).toBe(false);
    expect(
      segmentBlocked(wall, [3.5, 5.5, 0.5], [3.5, -2.5, 0.5], 'effect'),
    ).toBe(true);
  });

  it('работает в отрицательных координатах', () => {
    const map = mapWith({ op: 'setBlock', at: [-4, 0, -4], block: 'stone' });
    expect(
      segmentBlocked(map, [-1.5, 0.5, -1.5], [-6.5, 0.5, -6.5], 'effect'),
    ).toBe(true);
    expect(
      segmentBlocked(map, [-1.5, 0.5, -1.5], [-6.5, 0.5, -1.5], 'effect'),
    ).toBe(false);
  });

  it('касание грани или ребра — не препятствие', () => {
    // По верхней грани блока и через его верхнее ребро по диагонали.
    expect(segmentBlocked(wall, [0.5, 1, 0.5], [6.5, 1, 0.5], 'effect')).toBe(
      false,
    );
    expect(segmentBlocked(wall, [2, 0, 0.5], [5, 3, 0.5], 'effect')).toBe(
      false,
    );
  });

  it('проверяет коробки фигуры, а не клетку целиком', () => {
    // Плита закрывает только нижнюю половину клетки.
    const slab = mapWith({
      op: 'setBlock',
      at: [3, 0, 0],
      block: 'stone_slab',
    });
    expect(
      segmentBlocked(slab, [0.5, 0.25, 0.5], [6.5, 0.25, 0.5], 'effect'),
    ).toBe(true);
    expect(
      segmentBlocked(slab, [0.5, 0.75, 0.5], [6.5, 0.75, 0.5], 'effect'),
    ).toBe(false);
  });

  it('тонкая стена с поворотом 90° закрывает только восточную полоску', () => {
    const map = mapWith({
      op: 'setBlock',
      at: [0, 0, 3],
      block: 'stone_wall',
      rotation: 90,
    });
    expect(
      segmentBlocked(map, [0.9, 0.5, 0.5], [0.9, 0.5, 6.5], 'effect'),
    ).toBe(true);
    expect(
      segmentBlocked(map, [0.5, 0.5, 0.5], [0.5, 0.5, 6.5], 'effect'),
    ).toBe(false);
  });

  it('стекло пропускает взгляд, но не эффект', () => {
    const glass = mapWith({ op: 'setBlock', at: [3, 0, 0], block: 'glass' });
    expect(
      segmentBlocked(glass, [0.5, 0.5, 0.5], [6.5, 0.5, 0.5], 'sight'),
    ).toBe(false);
    expect(
      segmentBlocked(glass, [0.5, 0.5, 0.5], [6.5, 0.5, 0.5], 'effect'),
    ).toBe(true);
  });
});
