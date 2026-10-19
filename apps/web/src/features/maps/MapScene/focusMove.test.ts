import { describe, expect, it } from 'vitest';
import { centerLevel, moveAt, startMove } from './focusMove';

describe('moveAt', () => {
  const move = startMove([4, 1, 4], [4, 11, 14], [10, 3, 2], 1000, 200);

  it('в начале — там же, в конце — у новой точки, камера сдвинута на столько же', () => {
    expect(moveAt(move, 1000)).toEqual({
      target: [4, 1, 4],
      position: [4, 11, 14],
      done: false,
    });
    expect(moveAt(move, 1200)).toEqual({
      target: [10, 3, 2],
      position: [10, 13, 12],
      done: true,
    });
    expect(moveAt(move, 5000).done).toBe(true);
  });

  it('по пути смещение камеры равно смещению центра: угол и расстояние те же', () => {
    const { target, position, done } = moveAt(move, 1100);
    expect(done).toBe(false);
    expect(target[0]).toBeGreaterThan(4);
    expect(target[0]).toBeLessThan(10);
    position.forEach((v, axis) =>
      expect(v - target[axis]).toBeCloseTo([0, 10, 10][axis]),
    );
  });
});

describe('centerLevel', () => {
  it('уровень — целая часть высоты, с допуском на округление', () => {
    expect(centerLevel(3)).toBe(3);
    expect(centerLevel(3.5)).toBe(3);
    expect(centerLevel(2.9999999)).toBe(3);
    expect(centerLevel(-0.5)).toBe(-1);
  });
});
