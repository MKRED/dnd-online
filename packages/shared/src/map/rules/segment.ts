import { blockInfo } from '../blockInfo.js';
import { AIR, cellRotation } from '../cell.js';
import { readCell } from '../chunkStore.js';
import { CHUNK_SIZE, chunkKey, localIndex, type Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import { shapeBoxes, type ShapeBox } from '../shapes.js';
import type { Point3 } from './creature.js';
import {
  furnitureCellAt,
  furnitureCellKey,
  type FurnitureLayer,
} from './furniture/furnitureLayer.js';

// «Обзор» — видно ли (стекло и лёд пропускают взгляд), «эффект» — пройдёт ли стрела
// или заклинание (для них любой блок — полное укрытие).
export type RayMode = 'sight' | 'effect';

// Пересечение по касательной (луч скользит по грани или ребру) препятствием не считаем:
// иначе исход зависел бы от ошибок округления на границе клетки.
const MIN_OVERLAP = 1e-9;

const NO_BOXES: readonly ShapeBox[] = [];

function boxesOf(
  map: MapState,
  value: number,
  mode: RayMode,
): readonly ShapeBox[] {
  const block = blockInfo(map, value);
  if (!block) return NO_BOXES;
  if (mode === 'sight' && !block.traits.opaque) return NO_BOXES;
  return shapeBoxes(block.shape, cellRotation(value));
}

// Коробки по значению клетки (id типа и поворот) — на один вызов луча: туман войны
// пускает тысячи лучей, и поиск блока по имени на каждой клетке был бы главной ценой.
function boxCache(map: MapState, mode: RayMode) {
  const cache = new Map<number, readonly ShapeBox[]>();
  return (value: number) => {
    if (value === AIR) return NO_BOXES;
    let boxes = cache.get(value);
    if (!boxes) {
      boxes = boxesOf(map, value, mode);
      cache.set(value, boxes);
    }
    return boxes;
  };
}

// Проходит ли отрезок from→to (t ∈ [0, 1]) сквозь коробку клетки — метод плит.
function segmentHitsBox(
  from: Point3,
  dir: Point3,
  cx: number,
  cy: number,
  cz: number,
  box: ShapeBox,
): boolean {
  let enter = 0;
  let exit = 1;
  const cell = [cx, cy, cz];
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

// Лежит ли точка строго внутри фигуры блока (любого, и стекла тоже) или вокселей обстановки.
export function pointInSolid(map: MapState, point: Point3): boolean {
  const cell: Vec3 = [
    Math.floor(point[0]),
    Math.floor(point[1]),
    Math.floor(point[2]),
  ];
  const inside = (box: ShapeBox) =>
    [0, 1, 2].every(
      (a) => point[a] > cell[a] + box[a] && point[a] < cell[a] + box[a + 3],
    );
  return (
    boxesOf(map, readCell(map.store, cell), 'effect').some(inside) ||
    (furnitureCellAt(map.furniture, cell)?.boxes.some(inside) ?? false)
  );
}

// Слой обстановки, если отрезок вообще задевает её границы, иначе null: лучи тумана
// вдали от обстановки не ищут её клетки.
function furnitureNear(
  layer: FurnitureLayer | undefined,
  from: Point3,
  to: Point3,
): FurnitureLayer | null {
  const bounds = layer?.bounds;
  if (!bounds) return null;
  for (let a = 0; a < 3; a++) {
    if (Math.max(from[a], to[a]) < bounds.min[a]) return null;
    if (Math.min(from[a], to[a]) >= bounds.max[a] + 1) return null;
  }
  return layer;
}

// Перекрыт ли отрезок блоками или вокселями обстановки (её видно и сквозь неё не
// стреляют в обоих режимах: стеклянной обстановки нет). Обход клеток вдоль отрезка — 3D DDA (Amanatides–Woo),
// внутри клетки проверяются коробки её фигуры, а не клетка целиком. Чанк берётся из
// хранилища только при переходе в другой чанк: строковый ключ на каждую клетку
// стоил больше самого обхода.
export function segmentBlocked(
  map: MapState,
  from: Point3,
  to: Point3,
  mode: RayMode,
): boolean {
  const boxes = boxCache(map, mode);
  const furniture = furnitureNear(map.furniture, from, to);
  const dir: Point3 = [to[0] - from[0], to[1] - from[1], to[2] - from[2]];
  const [dx, dy, dz] = dir;
  let x = Math.floor(from[0]);
  let y = Math.floor(from[1]);
  let z = Math.floor(from[2]);
  const sx = Math.sign(dx);
  const sy = Math.sign(dy);
  const sz = Math.sign(dz);
  // Нулевая компонента направления: по этой оси клетку никогда не меняем.
  const deltaX = dx === 0 ? Infinity : Math.abs(1 / dx);
  const deltaY = dy === 0 ? Infinity : Math.abs(1 / dy);
  const deltaZ = dz === 0 ? Infinity : Math.abs(1 / dz);
  let maxX = dx === 0 ? Infinity : ((dx > 0 ? x + 1 : x) - from[0]) / dx;
  let maxY = dy === 0 ? Infinity : ((dy > 0 ? y + 1 : y) - from[1]) / dy;
  let maxZ = dz === 0 ? Infinity : ((dz > 0 ? z + 1 : z) - from[2]) / dz;
  // Ровно столько шагов, сколько границ клеток пересекает отрезок, — без риска зациклиться.
  const steps =
    Math.abs(Math.floor(to[0]) - x) +
    Math.abs(Math.floor(to[1]) - y) +
    Math.abs(Math.floor(to[2]) - z);

  let chunkX = NaN;
  let chunkY = NaN;
  let chunkZ = NaN;
  let chunk: Uint16Array | undefined;
  for (let i = 0; ; i++) {
    const kx = Math.floor(x / CHUNK_SIZE);
    const ky = Math.floor(y / CHUNK_SIZE);
    const kz = Math.floor(z / CHUNK_SIZE);
    if (kx !== chunkX || ky !== chunkY || kz !== chunkZ) {
      chunkX = kx;
      chunkY = ky;
      chunkZ = kz;
      chunk = map.store.get(chunkKey(kx, ky, kz));
    }
    if (chunk) {
      const value =
        chunk[
          localIndex(
            x - kx * CHUNK_SIZE,
            y - ky * CHUNK_SIZE,
            z - kz * CHUNK_SIZE,
          )
        ];
      if (value !== AIR) {
        for (const box of boxes(value)) {
          if (segmentHitsBox(from, dir, x, y, z, box)) return true;
        }
      }
    }
    if (furniture && x >= 0 && y >= 0 && z >= 0) {
      const cell = furniture.cells.get(furnitureCellKey(x, y, z));
      if (cell) {
        for (const box of cell.boxes) {
          if (segmentHitsBox(from, dir, x, y, z, box)) return true;
        }
      }
    }
    if (i >= steps) return false;
    if (maxX <= maxY && maxX <= maxZ) {
      x += sx;
      maxX += deltaX;
    } else if (maxY <= maxZ) {
      y += sy;
      maxY += deltaY;
    } else {
      z += sz;
      maxZ += deltaZ;
    }
  }
}
