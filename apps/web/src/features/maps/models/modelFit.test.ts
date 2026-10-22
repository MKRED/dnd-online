import { describe, expect, it } from 'vitest';
import { placedHeight, placeModel, type ModelBox } from './modelFit';

const fit = { scale: 1, turn: 0 as const, up: 'y' as const };

describe('placeModel', () => {
  it('вписывает основание в 0.9 места и ставит модель на пол по центру', () => {
    // Фигурка 2 × 6 × 1 метра, стоит не в нуле.
    const box: ModelBox = { min: [10, 5, -3], max: [12, 11, -2] };
    const placed = placeModel(box, 1, fit);
    expect(placed.scale).toBeCloseTo(0.45);
    expect(placed.position[0]).toBeCloseTo(-11 * 0.45);
    expect(placed.position[1]).toBeCloseTo(-5 * 0.45);
    expect(placed.position[2]).toBeCloseTo(2.5 * 0.45);
    expect(placedHeight(box, 1, fit)).toBeCloseTo(6 * 0.45);
  });

  it('Большое существо занимает 2 клетки, множитель поправки умножает размер', () => {
    const box: ModelBox = { min: [0, 0, 0], max: [1, 2, 1] };
    expect(placeModel(box, 2, fit).scale).toBeCloseTo(1.8);
    expect(placeModel(box, 1, { ...fit, scale: 2 }).scale).toBeCloseTo(1.8);
  });

  it('у STL «верх» — Z: высота берётся по Z, а пол — по нижней грани Z', () => {
    // Миниатюра для печати: основание 20 × 20 мм в плоскости XY, высота 40 мм по Z.
    const box: ModelBox = { min: [0, 0, 2], max: [20, 20, 42] };
    const zUp = { ...fit, up: 'z' as const };
    const placed = placeModel(box, 1, zUp);
    expect(placed.upRotationX).toBeCloseTo(-Math.PI / 2);
    expect(placed.scale).toBeCloseTo(0.045);
    expect(placed.position[1]).toBeCloseTo(-2 * 0.045);
    expect(placedHeight(box, 1, zUp)).toBeCloseTo(40 * 0.045);
  });

  it('поворот лицом — четверти оборота', () => {
    const box: ModelBox = { min: [0, 0, 0], max: [1, 1, 1] };
    expect(placeModel(box, 1, { ...fit, turn: 3 }).yaw).toBeCloseTo(
      (3 * Math.PI) / 2,
    );
  });

  it('плоская модель без основания не уходит в бесконечность', () => {
    const box: ModelBox = { min: [0, 0, 0], max: [0, 2, 0] };
    expect(Number.isFinite(placeModel(box, 1, fit).scale)).toBe(true);
  });
});
