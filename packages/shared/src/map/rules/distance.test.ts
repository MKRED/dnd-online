import { describe, expect, it } from 'vitest';
import {
  boxDistance,
  cellDistance,
  cellsToFeet,
  creatureCells,
} from './distance.js';

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

describe('creatureCells', () => {
  it('Средний — клетка основания и одна над ней, Большой — 2×3×2', () => {
    expect(creatureCells([3, 1, 4], 'medium')).toEqual({
      min: [3, 1, 4],
      max: [3, 2, 4],
    });
    expect(creatureCells([0, 0, 0], 'large')).toEqual({
      min: [0, 0, 0],
      max: [1, 2, 1],
    });
  });

  it('Маленький и Крошечный — одна клетка', () => {
    const one = { min: [2, 0, 2], max: [2, 0, 2] };
    expect(creatureCells([2, 0, 2], 'small')).toEqual(one);
    expect(creatureCells([2, 0, 2], 'tiny')).toEqual(one);
  });

  // Высота считается, как горизонталь (2024): Средний достаёт мечом соседа на 1–2 блока
  // выше или ниже, на 3 — уже нет (проверено 2026-10-28 по просьбе Михаила).
  it('сосед на уступе: до 2 блоков выше или ниже — 5 фт., на 3 — 10 фт.', () => {
    const hero = creatureCells([0, 1, 0], 'medium');
    const at = (dy: number) =>
      cellsToFeet(boxDistance(hero, creatureCells([1, 1 + dy, 0], 'medium')));
    expect([-3, -2, -1, 1, 2, 3].map(at)).toEqual([10, 5, 5, 5, 5, 10]);
    const goblin = (dy: number) =>
      cellsToFeet(boxDistance(hero, creatureCells([1, 1 + dy, 0], 'small')));
    expect([-2, -1, 2].map(goblin)).toEqual([10, 5, 5]);
  });
});
