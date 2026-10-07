import { describe, expect, it } from 'vitest';
import { applyOp } from '../applyOp.js';
import { MemoryChunkStore } from '../chunkStore.js';
import type { MapState } from '../mapState.js';
import type { MapOp } from '../ops.js';
import { createPalette } from '../palette.js';
import { standHeight } from './standing.js';

// Пол из земли под y = 0 и операции поверх него.
function floorWith(...ops: MapOp[]): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  applyOp(map, {
    op: 'fillBox',
    from: [-6, -1, -6],
    to: [6, -1, 6],
    block: 'dirt',
  });
  for (const op of ops) applyOp(map, op);
  return map;
}

// Стена из камня по z = 0 (x от −4 до 4, высота 5) с проёмом.
function wallWithHole(holeTo: [x: number, y: number]): MapState {
  return floorWith(
    { op: 'fillBox', from: [-4, 0, 0], to: [4, 4, 0], block: 'stone' },
    {
      op: 'fillBox',
      from: [0, 0, 0],
      to: [holeTo[0], holeTo[1], 0],
      block: 'air',
    },
  );
}

describe('standHeight: опора', () => {
  it('на полу — высота 0, в воздухе и внутри блока — нельзя', () => {
    const map = floorWith();
    expect(standHeight(map, [0, 0, 0], 'medium')).toBe(0);
    expect(standHeight(map, [0, 1, 0], 'medium')).toBeNull();
    expect(standHeight(map, [0, -1, 0], 'medium')).toBeNull();
    expect(standHeight(map, [20, 0, 0], 'medium')).toBeNull();
  });

  it('Большому хватает опоры под одной клеткой из четырёх', () => {
    const map = floorWith();
    expect(standHeight(map, [6, 0, 6], 'large')).toBe(0);
    expect(standHeight(map, [7, 0, 7], 'large')).toBeNull();
  });

  it('на плите и ступенях — на полблока выше', () => {
    const map = floorWith(
      { op: 'setBlock', at: [0, 0, 0], block: 'wood_slab' },
      { op: 'setBlock', at: [2, 0, 0], block: 'wood_stairs' },
    );
    expect(standHeight(map, [0, 0, 0], 'medium')).toBe(0.5);
    // Верхняя ступень своей клетки не мешает — иначе по лестнице не пройти.
    expect(standHeight(map, [2, 0, 0], 'medium')).toBe(0.5);
  });
});

describe('standHeight: просвет по росту', () => {
  it('дверь 1×2: Средний проходит, Большой — нет', () => {
    const map = wallWithHole([0, 1]);
    expect(standHeight(map, [0, 0, 0], 'medium')).toBe(0);
    expect(standHeight(map, [0, 0, 0], 'large')).toBeNull();
    expect(standHeight(map, [-1, 0, -1], 'large')).toBeNull();
  });

  it('ворота 2×3: Большой проходит, а в 2×2 — нет', () => {
    expect(standHeight(wallWithHole([1, 2]), [0, 0, -1], 'large')).toBe(0);
    expect(standHeight(wallWithHole([1, 1]), [0, 0, -1], 'large')).toBeNull();
  });

  it('лаз 1×1: Маленький пролезает, Средний — нет', () => {
    const map = wallWithHole([0, 0]);
    expect(standHeight(map, [0, 0, 0], 'small')).toBe(0);
    expect(standHeight(map, [0, 0, 0], 'medium')).toBeNull();
  });

  it('потолок в 2 блока: на полу можно, на плите — уже нет', () => {
    const map = floorWith(
      { op: 'fillBox', from: [-2, 2, -2], to: [2, 2, 2], block: 'stone' },
      { op: 'setBlock', at: [1, 0, 0], block: 'stone_slab' },
    );
    expect(standHeight(map, [0, 0, 0], 'medium')).toBe(0);
    expect(standHeight(map, [1, 0, 0], 'medium')).toBeNull();
    expect(standHeight(map, [1, 0, 0], 'small')).toBe(0.5);
  });

  it('любой блок в объёме тела мешает: тонкая стена, столб, верхняя плита, стекло', () => {
    const map = floorWith(
      { op: 'setBlock', at: [0, 0, 0], block: 'wood_wall' },
      { op: 'setBlock', at: [1, 0, 0], block: 'stone_pillar' },
      { op: 'setBlock', at: [2, 1, 0], block: 'stone_slab_top' },
      { op: 'setBlock', at: [3, 0, 0], block: 'glass' },
    );
    expect(standHeight(map, [0, 0, 0], 'medium')).toBeNull();
    expect(standHeight(map, [1, 0, 0], 'medium')).toBeNull();
    expect(standHeight(map, [1, 0, 0], 'tiny')).toBeNull();
    expect(standHeight(map, [2, 0, 0], 'medium')).toBeNull();
    expect(standHeight(map, [2, 0, 0], 'small')).toBe(0);
    expect(standHeight(map, [3, 0, 0], 'small')).toBeNull();
  });

  it('ступени над головой мешают — исключение только на уровне ног', () => {
    const map = floorWith({
      op: 'setBlock',
      at: [0, 1, 0],
      block: 'wood_stairs',
    });
    expect(standHeight(map, [0, 0, 0], 'medium')).toBeNull();
    expect(standHeight(map, [0, 0, 0], 'small')).toBe(0);
  });
});
