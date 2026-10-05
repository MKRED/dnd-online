import { getBlock, MATERIALS } from '../blocks.js';
import { cellRotation, cellTypeId } from '../cell.js';
import { readCell } from '../chunkStore.js';
import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import { shapeBoxes, type ShapeBox } from '../shapes.js';
import type { Point3 } from './creature.js';

// «Обзор» — видно ли (стекло и лёд пропускают взгляд), «эффект» — пройдёт ли стрела
// или заклинание (для них любой блок — полное укрытие).
export type RayMode = 'sight' | 'effect';

// Пересечение по касательной (луч скользит по грани или ребру) препятствием не считаем:
// иначе исход зависел бы от ошибок округления на границе клетки.
const MIN_OVERLAP = 1e-9;

function obstacleBoxes(map: MapState, cell: Vec3, mode: RayMode): ShapeBox[] {
  const value = readCell(map.store, cell);
  const block = getBlock(map.palette[cellTypeId(value)] ?? '');
  if (!block) return [];
  if (mode === 'sight' && !MATERIALS[block.material].opaque) return [];
  return shapeBoxes(block.shape, cellRotation(value));
}

// Проходит ли отрезок from→to (t ∈ [0, 1]) сквозь коробку клетки — метод плит.
function segmentHitsBox(
  from: Point3,
  dir: Point3,
  cell: Vec3,
  box: ShapeBox,
): boolean {
  let enter = 0;
  let exit = 1;
  for (let axis = 0; axis < 3; axis++) {
    const lo = cell[axis] + box[axis];
    const hi = cell[axis] + box[axis + 3];
    if (dir[axis] === 0) {
      // Луч параллелен плите: строго внутри — пересекает, на грани — скользит.
      if (from[axis] <= lo || from[axis] >= hi) return false;
      continue;
    }
    const t1 = (lo - from[axis]) / dir[axis];
    const t2 = (hi - from[axis]) / dir[axis];
    enter = Math.max(enter, Math.min(t1, t2));
    exit = Math.min(exit, Math.max(t1, t2));
  }
  return exit - enter > MIN_OVERLAP;
}

// Лежит ли точка строго внутри фигуры блока (любого, и стекла тоже).
export function pointInSolid(map: MapState, point: Point3): boolean {
  const cell: Vec3 = [
    Math.floor(point[0]),
    Math.floor(point[1]),
    Math.floor(point[2]),
  ];
  return obstacleBoxes(map, cell, 'effect').some((box) =>
    [0, 1, 2].every(
      (a) => point[a] > cell[a] + box[a] && point[a] < cell[a] + box[a + 3],
    ),
  );
}

// Перекрыт ли отрезок блоками. Обход клеток вдоль отрезка — 3D DDA (Amanatides–Woo),
// внутри клетки проверяются коробки её фигуры, а не клетка целиком.
export function segmentBlocked(
  map: MapState,
  from: Point3,
  to: Point3,
  mode: RayMode,
): boolean {
  const dir: Point3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const cell = [0, 1, 2].map((a) => Math.floor(from[a]));
  const end = [0, 1, 2].map((a) => Math.floor(to[a]));
  const step = dir.map(Math.sign);
  // Нулевая компонента направления: по этой оси клетку никогда не меняем.
  const tDelta = dir.map((d) => (d === 0 ? Infinity : Math.abs(1 / d)));
  const tMax = dir.map((d, a) => {
    if (d === 0) return Infinity;
    const boundary = d > 0 ? cell[a] + 1 : cell[a];
    return (boundary - from[a]) / d;
  });
  // Ровно столько шагов, сколько границ клеток пересекает отрезок, — без риска зациклиться.
  const steps = [0, 1, 2].reduce((n, a) => n + Math.abs(end[a] - cell[a]), 0);

  for (let i = 0; ; i++) {
    const current: Vec3 = [cell[0], cell[1], cell[2]];
    const boxes = obstacleBoxes(map, current, mode);
    if (boxes.some((box) => segmentHitsBox(from, dir, current, box))) {
      return true;
    }
    if (i >= steps) return false;
    const axis =
      tMax[0] <= tMax[1] && tMax[0] <= tMax[2] ? 0 : tMax[1] <= tMax[2] ? 1 : 2;
    cell[axis] += step[axis];
    tMax[axis] += tDelta[axis];
  }
}
