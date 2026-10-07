import { describe, expect, it } from 'vitest';
import { applyOp } from '../applyOp.js';
import { MemoryChunkStore } from '../chunkStore.js';
import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import type { MapOp } from '../ops.js';
import { createPalette } from '../palette.js';
import { stepCost } from './step.js';

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

// Стоимость пути по цепочке позиций в обе стороны: [туда, обратно].
function both(map: MapState, a: Vec3, b: Vec3) {
  return [stepCost(map, a, b, 'medium'), stepCost(map, b, a, 'medium')];
}

describe('stepCost: ровная земля', () => {
  const map = floorWith({
    op: 'fillBox',
    from: [3, -1, 0],
    to: [3, -1, 0],
    block: 'ice',
  });

  it('прямо и по диагонали — 5 футов, на лёд — 10', () => {
    expect(stepCost(map, [0, 0, 0], [1, 0, 0], 'medium')).toBe(5);
    expect(stepCost(map, [0, 0, 0], [1, 0, 1], 'medium')).toBe(5);
    expect(both(map, [2, 0, 0], [3, 0, 0])).toEqual([10, 5]);
  });

  it('только в соседнюю позицию и не на месте', () => {
    expect(stepCost(map, [0, 0, 0], [2, 0, 0], 'medium')).toBeNull();
    expect(stepCost(map, [0, 0, 0], [0, 1, 0], 'medium')).toBeNull();
  });

  it('Большой труднопроходим, если лёд хоть под одной клеткой основания', () => {
    expect(stepCost(map, [1, 0, -2], [2, 0, -1], 'large')).toBe(10);
    expect(stepCost(map, [0, 0, -2], [1, 0, -2], 'large')).toBe(5);
  });
});

describe('stepCost: перепад высоты', () => {
  it('на плиту и с неё на блок — по полблока, на блок с земли — нельзя', () => {
    const map = floorWith(
      { op: 'setBlock', at: [1, 0, 0], block: 'stone_slab' },
      { op: 'setBlock', at: [2, 0, 0], block: 'stone' },
      { op: 'setBlock', at: [2, 0, 2], block: 'stone' },
    );
    expect(both(map, [0, 0, 0], [1, 0, 0])).toEqual([5, 5]);
    expect(both(map, [1, 0, 0], [2, 1, 0])).toEqual([5, 5]);
    expect(both(map, [1, 0, 2], [2, 1, 2])).toEqual([null, null]);
  });

  it('по лестнице из ступеней — вверх и вниз', () => {
    // Подъём к югу (+z): земля → ступень → ступень на блок выше → площадка.
    const map = floorWith(
      { op: 'setBlock', at: [0, 0, 1], block: 'wood_stairs' },
      { op: 'setBlock', at: [0, 0, 2], block: 'stone' },
      { op: 'setBlock', at: [0, 1, 2], block: 'wood_stairs' },
      { op: 'fillBox', from: [0, 0, 3], to: [0, 1, 3], block: 'stone' },
    );
    expect(both(map, [0, 0, 0], [0, 0, 1])).toEqual([5, 5]);
    expect(both(map, [0, 0, 1], [0, 1, 2])).toEqual([5, 5]);
    expect(both(map, [0, 1, 2], [0, 2, 3])).toEqual([5, 5]);
  });

  it('на блок выше — только прямо по ступеням в сторону подъёма', () => {
    const map = floorWith(
      // Подъём к северу (−z): идти на юг по ним на блок вверх нельзя.
      { op: 'setBlock', at: [0, 0, 1], block: 'wood_stairs', rotation: 180 },
      { op: 'setBlock', at: [0, 0, 2], block: 'stone' },
      { op: 'setBlock', at: [0, 1, 2], block: 'stone_slab' },
      // Сбоку от ступеней, подъём к югу: шаг на восток на блок вверх нельзя.
      { op: 'setBlock', at: [3, 0, 1], block: 'wood_stairs' },
      { op: 'setBlock', at: [4, 0, 1], block: 'stone' },
      { op: 'setBlock', at: [4, 1, 1], block: 'stone_slab' },
    );
    expect(both(map, [0, 0, 1], [0, 1, 2])).toEqual([null, null]);
    expect(both(map, [3, 0, 1], [4, 1, 1])).toEqual([null, null]);
  });
});

describe('stepCost: углы', () => {
  it('по диагонали — только если проходимы обе соседние прямые клетки', () => {
    const one = floorWith({ op: 'setBlock', at: [1, 0, 0], block: 'stone' });
    expect(stepCost(one, [0, 0, 0], [1, 0, 1], 'medium')).toBeNull();
    expect(stepCost(one, [0, 0, 1], [1, 0, 2], 'medium')).toBe(5);
    // Яма в углу тоже не даёт срезать: соседняя клетка должна быть проходима.
    const pit = floorWith({ op: 'setBlock', at: [1, -1, 0], block: 'air' });
    expect(stepCost(pit, [0, 0, 0], [1, 0, 1], 'medium')).toBeNull();
  });

  it('по диагонали на плиту — через соседей на любом из двух уровней', () => {
    const map = floorWith({
      op: 'setBlock',
      at: [1, 0, 1],
      block: 'stone_slab',
    });
    expect(both(map, [0, 0, 0], [1, 0, 1])).toEqual([5, 5]);
  });
});
