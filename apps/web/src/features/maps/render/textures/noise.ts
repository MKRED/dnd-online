import { TILE_SIZE } from './pixels';

// Случайность текстур детерминирована: одна и та же плитка на каждой машине и в каждом
// снимке, поэтому не Math.random, а хэш от координат и «зерна» материала.
export function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

const wrap = (value: number, period: number) =>
  ((value % period) + period) % period;

const smooth = (t: number) => t * t * (3 - 2 * t);

// Плавный шум от 0 до 1 с ячейкой cell пикселей. Сетка значений замкнута по краю
// плитки, поэтому шум бесшовный: стена из одинаковых блоков не делится на квадраты.
// cell должен делить размер плитки (1, 2, 4, 8, 16).
export function valueNoise(
  x: number,
  y: number,
  cell: number,
  seed: number,
  cellY = cell,
): number {
  const periodX = TILE_SIZE / cell;
  const periodY = TILE_SIZE / cellY;
  const gx = x / cell;
  const gy = y / cellY;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const at = (ix: number, iy: number) =>
    hash(wrap(ix, periodX), wrap(iy, periodY), seed);
  const tx = smooth(gx - x0);
  const ty = smooth(gy - y0);
  const top = at(x0, y0) + (at(x0 + 1, y0) - at(x0, y0)) * tx;
  const bottom = at(x0, y0 + 1) + (at(x0 + 1, y0 + 1) - at(x0, y0 + 1)) * tx;
  return top + (bottom - top) * ty;
}

// Шум из двух масштабов: крупные пятна и мелкая зернистость.
export function layeredNoise(x: number, y: number, seed: number): number {
  return (
    valueNoise(x, y, 8, seed) * 0.5 +
    valueNoise(x, y, 4, seed + 1) * 0.3 +
    hash(x, y, seed + 2) * 0.2
  );
}

// Растянуть шум от середины: у плавного шума значения жмутся к 0.5, а лаве и топи
// нужны и тёмные корки, и яркие пятна. Ступени — пиксельный вид вместо размытого.
export function contrast(value: number, k: number, steps = 6): number {
  const stretched = Math.min(1, Math.max(0, (value - 0.5) * k + 0.5));
  return Math.round(stretched * steps) / steps;
}
