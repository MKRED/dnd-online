import { describe, expect, it } from 'vitest';
import { meshCellSize } from './meshCellSize';

// Коробка из двух треугольников по углам: хватает крайних точек.
const box = (x: number, y: number, z: number) =>
  new Float32Array([0, 0, 0, x, 0, 0, 0, y, 0, 0, 0, z, x, y, z, 0, 0, 0]);

const UP_Y = { up: 'y', turn: 0 } as const;

describe('meshCellSize', () => {
  it('длинная сторона основания — во всё место, высота по пропорциям', () => {
    expect(meshCellSize(box(10, 13, 5), UP_Y, 2)).toEqual([2, 3, 1]);
  });

  it('ровная сторона не округляется вверх', () => {
    expect(meshCellSize(box(4, 8, 4), UP_Y, 2)).toEqual([2, 4, 2]);
  });

  it('высокая модель ужимается под предел высоты', () => {
    expect(meshCellSize(box(1, 40, 1), UP_Y, 4)).toEqual([1, 8, 1]);
  });

  it('ось верха Z: высота файла — по Z', () => {
    expect(meshCellSize(box(2, 2, 6), { up: 'z', turn: 0 }, 1)).toEqual([
      1, 3, 1,
    ]);
  });

  it('крошечное существо — всё равно одна клетка', () => {
    expect(meshCellSize(box(1, 1, 1), UP_Y, 0.5)).toEqual([1, 1, 1]);
  });

  it('пустой файл — куб места', () => {
    expect(meshCellSize(new Float32Array(), UP_Y, 3)).toEqual([3, 3, 3]);
  });
});
