import { describe, expect, it } from 'vitest';
import { stepFacing } from './mapObject.js';

describe('stepFacing', () => {
  it('восемь направлений по часовой от севера (−z)', () => {
    const cases: [number, number, number][] = [
      [0, -1, 0],
      [1, -1, 45],
      [1, 0, 90],
      [1, 1, 135],
      [0, 1, 180],
      [-1, 1, 225],
      [-1, 0, 270],
      [-1, -1, 315],
    ];
    for (const [dx, dz, facing] of cases) {
      expect(stepFacing([5, 1, 5], [5 + dx, 2, 5 + dz])).toBe(facing);
    }
  });

  it('без сдвига по x и z — север', () => {
    expect(stepFacing([1, 1, 1], [1, 2, 1])).toBe(0);
  });
});
