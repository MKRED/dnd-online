import { describe, expect, it } from 'vitest';
import { applyOp } from '../../applyOp.js';
import { MemoryChunkStore } from '../../chunkStore.js';
import type { Vec3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import type { MapOp } from '../../ops.js';
import { createPalette } from '../../palette.js';
import type { CreatureSize } from '../creature.js';
import { stepCost } from '../step.js';
import { findPath, reachable, type PathResult } from './search.js';

// Пол из земли под y = 0 (x и z от −6 до 6) и операции поверх него.
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

// Путь состоит из законных шагов, и их сумма — его цена.
function expectValid(
  map: MapState,
  result: PathResult | null,
  size: CreatureSize = 'medium',
) {
  expect(result).not.toBeNull();
  const { path, cost } = result as PathResult;
  let sum = 0;
  for (let i = 1; i < path.length; i++) {
    const step = stepCost(map, path[i - 1], path[i], size);
    expect(step).not.toBeNull();
    sum += step ?? 0;
  }
  expect(sum).toBe(cost);
}

describe('reachable', () => {
  it('30 футов по ровному полу — квадрат 13×13 (диагональ = 5 футов)', () => {
    const cells = reachable(floorWith(), [0, 0, 0], 'medium', 30);
    expect(cells).toHaveLength(169);
    expect(cells.find((r) => r.cost === 0)?.at).toEqual([0, 0, 0]);
    expect(Math.max(...cells.map((r) => r.cost))).toBe(30);
  });

  it('лёд стоит вдвое: по полосе льда дальше 3 клеток не уйти', () => {
    const map = floorWith({
      op: 'fillBox',
      from: [-6, -1, -6],
      to: [6, -1, 6],
      block: 'ice',
    });
    expect(reachable(map, [0, 0, 0], 'medium', 30)).toHaveLength(49);
  });

  it('если в начальной позиции стоять нельзя — пусто', () => {
    expect(reachable(floorWith(), [0, 3, 0], 'medium', 30)).toEqual([]);
  });
});

describe('findPath', () => {
  // Стена по x = 2 от z = −3 до 3 высотой 2: обход через её конец.
  const wall = floorWith({
    op: 'fillBox',
    from: [2, 0, -3],
    to: [2, 1, 3],
    block: 'stone',
  });

  it('обходит стену, не срезая угол', () => {
    const result = findPath(wall, [0, 0, 0], [4, 0, 0], 'medium');
    expectValid(wall, result);
    expect(result?.cost).toBe(50);
    expect(result?.path[0]).toEqual([0, 0, 0]);
    expect(result?.path.at(-1)).toEqual([4, 0, 0]);
  });

  it('дороже предела или в замкнутую комнату — null', () => {
    expect(findPath(wall, [0, 0, 0], [4, 0, 0], 'medium', 45)).toBeNull();
    const room = floorWith({
      op: 'hollowBox',
      from: [2, 0, 2],
      to: [5, 3, 5],
      block: 'stone',
    });
    expect(findPath(room, [0, 0, 0], [3, 0, 3], 'medium')).toBeNull();
  });

  it('поднимается по лестнице из ступеней на площадку', () => {
    // Подъём к югу: ступень, ступень на блок выше, площадка высотой 2.
    const map = floorWith(
      { op: 'setBlock', at: [0, 0, 1], block: 'wood_stairs' },
      { op: 'setBlock', at: [0, 0, 2], block: 'stone' },
      { op: 'setBlock', at: [0, 1, 2], block: 'wood_stairs' },
      { op: 'fillBox', from: [-2, 0, 3], to: [2, 1, 5], block: 'stone' },
    );
    const result = findPath(map, [2, 0, 0], [2, 2, 4], 'medium');
    expectValid(map, result);
    expect(result?.path).toContainEqual([0, 1, 2]);
  });

  it('Большой не пролезает в проход шириной 1, ищет проход шириной 2', () => {
    // Стена по z = 0 с проходом шириной 1 у x = 0 и шириной 2 у x = 4…5.
    const map = floorWith(
      { op: 'fillBox', from: [-6, 0, 0], to: [6, 3, 0], block: 'stone' },
      { op: 'fillBox', from: [0, 0, 0], to: [0, 2, 0], block: 'air' },
      { op: 'fillBox', from: [4, 0, 0], to: [5, 2, 0], block: 'air' },
    );
    const medium = findPath(map, [0, 0, -3], [0, 0, 3], 'medium');
    expectValid(map, medium);
    expect(medium?.cost).toBe(30);
    const large = findPath(map, [0, 0, -3], [0, 0, 2], 'large');
    expectValid(map, large, 'large');
    expect(large?.path).toContainEqual([4, 0, 0]);
  });
});
