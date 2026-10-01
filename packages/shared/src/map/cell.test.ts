import { describe, expect, it } from 'vitest';
import {
  AIR,
  cellRotation,
  cellTypeId,
  encodeCell,
  ROTATIONS,
} from './cell.js';
import { rotateBox, shapeBoxes } from './shapes.js';

describe('кодирование клетки', () => {
  it('тип и поворот восстанавливаются', () => {
    for (const rotation of ROTATIONS) {
      const cell = encodeCell(42, rotation);
      expect(cellTypeId(cell)).toBe(42);
      expect(cellRotation(cell)).toBe(rotation);
    }
  });

  it('воздух — ровно 0 при любом повороте', () => {
    expect(encodeCell(AIR, 270)).toBe(0);
  });

  it('отклоняет id за пределами 14 бит', () => {
    expect(() => encodeCell(1 << 14)).toThrow(RangeError);
    expect(() => encodeCell(-1)).toThrow(RangeError);
  });
});

describe('поворот фигур', () => {
  it('стена с севера на 90° уходит на восток, на 180° — на юг, на 270° — на запад', () => {
    const [wall] = shapeBoxes('wall', 0);
    expect(rotateBox(wall, 90)).toEqual([0.8, 0, 0, 1, 1, 1]);
    expect(rotateBox(wall, 180)).toEqual([0, 0, 0.8, 1, 1, 1]);
    expect(rotateBox(wall, 270)).toEqual([0, 0, 0, 0.2, 1, 1]);
  });

  it('куб и столб от поворота не меняются', () => {
    expect(shapeBoxes('cube', 90)).toEqual(shapeBoxes('cube', 0));
    expect(shapeBoxes('pillar', 270)).toEqual(shapeBoxes('pillar', 0));
  });
});
