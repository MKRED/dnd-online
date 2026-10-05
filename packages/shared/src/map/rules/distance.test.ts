import { describe, expect, it } from 'vitest';
import { boxDistance, cellDistance, cellsToFeet } from './distance.js';

describe('cellDistance', () => {
  it('диагональ стоит как шаг по прямой, вертикаль — как горизонталь', () => {
    expect(cellDistance([0, 0, 0], [0, 0, 0])).toBe(0);
    expect(cellDistance([0, 0, 0], [1, 0, 1])).toBe(1);
    expect(cellDistance([0, 0, 0], [3, 4, 2])).toBe(4);
    expect(cellDistance([-2, 0, -2], [2, 1, 0])).toBe(4);
  });

  it('переводится в футы по 5 за клетку', () => {
    expect(cellsToFeet(cellDistance([0, 0, 0], [6, 0, 2]))).toBe(30);
  });
});

describe('boxDistance', () => {
  const medium = { min: [0, 0, 0], max: [0, 1, 0] } as const;

  it('соседние области — 1 клетка, пересекающиеся — 0', () => {
    expect(boxDistance(medium, { min: [1, 0, 1], max: [1, 1, 1] })).toBe(1);
    expect(boxDistance(medium, { min: [0, 1, 0], max: [1, 2, 1] })).toBe(0);
  });

  it('до Большого существа считается до ближайшей его клетки', () => {
    const large = { min: [3, 0, -1], max: [4, 2, 0] } as const;
    expect(boxDistance(medium, large)).toBe(3);
    expect(boxDistance(large, medium)).toBe(3);
  });
});
