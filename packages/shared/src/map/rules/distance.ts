import type { Box3, Vec3 } from '../coords.js';
import { CREATURE_SIZES, type CreatureSize } from './creature.js';

export const FEET_PER_CELL = 5;

// Правила 2024: диагональ стоит столько же, сколько шаг по прямой, а вертикаль
// считается как горизонталь. Поэтому расстояние в клетках — Чебышёв по трём осям.
export function cellDistance(a: Vec3, b: Vec3): number {
  return Math.max(
    Math.abs(a[0] - b[0]),
    Math.abs(a[1] - b[1]),
    Math.abs(a[2] - b[2]),
  );
}

// Расстояние между областями клеток (существо 2×2, область заклинания): дальность
// и досягаемость до Большого существа считаются до ближайшей занятой им клетки.
// Соседние области — 1 клетка (5 футов), пересекающиеся — 0.
export function boxDistance(a: Box3, b: Box3): number {
  let distance = 0;
  for (let axis = 0; axis < 3; axis++) {
    const gap = Math.max(a.min[axis] - b.max[axis], b.min[axis] - a.max[axis]);
    distance = Math.max(distance, gap);
  }
  return distance;
}

// Клетки тела для расстояния: основание и рост в целых клетках. Крошечное занимает свою
// клетку целиком: расстояние до него — как до клетки.
export function creatureCells(at: Vec3, size: CreatureSize): Box3 {
  const { footprint, height } = CREATURE_SIZES[size];
  const across = Math.max(1, Math.ceil(footprint)) - 1;
  const up = Math.max(1, Math.ceil(height)) - 1;
  return {
    min: at,
    max: [at[0] + across, at[1] + up, at[2] + across],
  };
}

export function cellsToFeet(cells: number): number {
  return cells * FEET_PER_CELL;
}
