import { describe, expect, it } from 'vitest';
import { applyOp } from '../../applyOp.js';
import { MemoryChunkStore } from '../../chunkStore.js';
import type { Vec3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import type { MapOp } from '../../ops.js';
import { createPalette } from '../../palette.js';
import { areaAffectsBody, areaCells } from './coverage.js';
import { prepareArea, type AreaShape } from './shapes.js';

function mapWith(...ops: MapOp[]): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  for (const op of ops) applyOp(map, op);
  return map;
}

// Число задетых клеток по слоям: { y: count }.
function layers(cells: Vec3[]): Record<number, number> {
  const result: Record<number, number> = {};
  for (const [, y] of cells) result[y] = (result[y] ?? 0) + 1;
  return result;
}

const has = (cells: Vec3[], cell: Vec3) =>
  cells.some((c) => c.every((v, a) => v === cell[a]));

describe('areaCells: совпадение с примерами DMG 2024', () => {
  const open = mapWith();

  it('цилиндр радиусом 10 футов — 12 клеток в каждом слое (4×4 без углов)', () => {
    const area: AreaShape = {
      shape: 'cylinder',
      origin: [0, 0, 0],
      radius: 2,
      height: 3,
      direction: 'up',
    };
    expect(layers(areaCells(open, area))).toEqual({ 0: 12, 1: 12, 2: 12 });
  });

  it('куб со стороной 20 футов — 16 клеток в слое', () => {
    const area: AreaShape = {
      shape: 'cube',
      origin: [0, 0, 2],
      from: [0, 0, 0],
      size: 4,
    };
    expect(layers(areaCells(open, area))).toEqual({
      0: 16,
      1: 16,
      2: 16,
      3: 16,
    });
  });

  it('линия шириной 5 футов по линии сетки — 2 ряда (каждый накрыт ровно наполовину)', () => {
    const cells = areaCells(open, {
      shape: 'line',
      origin: [0, 0.5, 0],
      direction: [1, 0, 0],
      length: 6,
      width: 1,
    });
    expect(cells).toHaveLength(12);
    expect(new Set(cells.map(([, , z]) => z))).toEqual(new Set([-1, 0]));
  });
});

describe('areaCells: фигуры', () => {
  const open = mapWith();

  it('сфера — шар, а не куб клеток: средние слои как круг радиусом 10 футов', () => {
    const cells = areaCells(open, {
      shape: 'sphere',
      origin: [0, 0, 0],
      radius: 2,
    });
    expect(layers(cells)).toEqual({ [-2]: 4, [-1]: 12, 0: 12, 1: 4 });
    // Огненный шар (20 футов) — регрессия на число клеток.
    const fireball = areaCells(open, {
      shape: 'sphere',
      origin: [0, 0, 0],
      radius: 4,
    });
    expect(fireball).toHaveLength(280);
  });

  it('конус 15 футов вдоль оси: ширина растёт с расстоянием', () => {
    const cells = areaCells(open, {
      shape: 'cone',
      origin: [0, 0.5, 0],
      direction: [1, 0, 0],
      length: 3,
    });
    expect(layers(cells)).toEqual({ [-1]: 2, 0: 4, 1: 2 });
    expect(cells.every(([x]) => x >= 0 && x < 3)).toBe(true);
  });

  it('излучение скругляет углы: прямо на 15 футов задето, по диагонали в углу — нет', () => {
    const cells = areaCells(open, {
      shape: 'emanation',
      source: { min: [0, 0, 0], max: [1, 2, 1] },
      distance: 3,
    });
    expect(has(cells, [3, 0, 0])).toBe(true);
    expect(has(cells, [0, 0, 0])).toBe(true);
    expect(has(cells, [3, 0, 3])).toBe(false);
  });

  it('проверяет параметры фигур', () => {
    expect(() =>
      prepareArea({
        shape: 'cube',
        origin: [1, 1, 1],
        from: [0, 0, 0],
        size: 3,
      }),
    ).toThrow(RangeError);
    expect(() =>
      prepareArea({
        shape: 'cone',
        origin: [0, 0, 0],
        direction: [0, 0, 0],
        length: 3,
      }),
    ).toThrow(RangeError);
  });
});

describe('areaCells: препятствия', () => {
  it('за стеной во всю высоту клеток нет, сплошные блоки не задеты', () => {
    const map = mapWith({
      op: 'fillBox',
      from: [2, -4, -6],
      to: [2, 4, 6],
      block: 'stone',
    });
    const cells = areaCells(map, {
      shape: 'sphere',
      origin: [0, 0, 0],
      radius: 4,
    });
    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every(([x]) => x < 2)).toBe(true);
  });

  it('взрыв на земле не уходит под землю', () => {
    const map = mapWith({
      op: 'fillBox',
      from: [-5, -3, -5],
      to: [5, -1, 5],
      block: 'dirt',
    });
    const cells = areaCells(map, {
      shape: 'sphere',
      origin: [0, 0, 0],
      radius: 2,
    });
    expect(layers(cells)).toEqual({ 0: 12, 1: 4 });
  });
});

describe('areaAffectsBody', () => {
  it('существо задето, если задета хоть одна его клетка', () => {
    const cells: Vec3[] = [[3, 0, 0]];
    expect(areaAffectsBody(cells, { min: [3, 0.5, 0], max: [4, 2.5, 1] })).toBe(
      true,
    );
    expect(areaAffectsBody(cells, { min: [4, 0, 0], max: [5, 2, 1] })).toBe(
      false,
    );
  });
});
