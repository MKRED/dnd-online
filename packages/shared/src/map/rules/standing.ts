import { blockInfo } from '../blockInfo.js';
import { cellRotation } from '../cell.js';
import { readCell } from '../chunkStore.js';
import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import { shapeBoxes, type ShapeBox } from '../shapes.js';
import {
  CREATURE_SIZES,
  creatureBody,
  surfaceInCell,
  type BodyBox,
  type CreatureSize,
} from './creature.js';
import { furnitureCellAt } from './furniture/furnitureLayer.js';

// Касание гранью — не пересечение, как у лучей: иначе существо не встало бы на пол.
const MIN_OVERLAP = 1e-9;

// Есть ли опора хотя бы под одной клеткой основания: плита или ступени в самой клетке
// или верх полного блока под ней. Большой может стоять на краю обрыва.
// null — в клетке основания полный блок: такая позиция на уровень выше.
function hasSupport(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
): boolean | null {
  const cells = Math.ceil(CREATURE_SIZES[size].footprint);
  let supported = false;
  for (let dx = 0; dx < cells; dx++) {
    for (let dz = 0; dz < cells; dz++) {
      const cell: Vec3 = [anchor[0] + dx, anchor[1], anchor[2] + dz];
      const surface = surfaceInCell(map, cell);
      if (surface === 1) return null;
      const below: Vec3 = [cell[0], cell[1] - 1, cell[2]];
      if (surface > 0 || surfaceInCell(map, below) === 1) supported = true;
    }
  }
  return supported;
}

function bodyHits(body: BodyBox, cell: Vec3, box: ShapeBox): boolean {
  return [0, 1, 2].every(
    (a) =>
      Math.min(body.max[a], cell[a] + box[a + 3]) -
        Math.max(body.min[a], cell[a] + box[a]) >
      MIN_OVERLAP,
  );
}

// Пересекает ли тело хоть одну коробку блока. Пока любой блок в объёме тела мешает
// (тонкая стена, столб, верхняя плита у головы, стекло) — частичные фигуры решим отдельно.
// Исключение — ступени на уровне ног: на нижней ступени стоят, а верхняя иначе упиралась бы
// в тело, и по лестнице было бы не пройти. Обстановка мешает по клеткам (план, «Путь — по
// клеткам»): препятствие — вся клетка, «можно встать сверху» — до верха вокселей.
function bodyBlocked(map: MapState, body: BodyBox, feetLevel: number): boolean {
  const from = body.min.map(Math.floor);
  const to = body.max.map((v) => Math.ceil(v) - 1);
  for (let y = from[1]; y <= to[1]; y++) {
    for (let z = from[2]; z <= to[2]; z++) {
      for (let x = from[0]; x <= to[0]; x++) {
        const cell: Vec3 = [x, y, z];
        const furniture = furnitureCellAt(map.furniture, cell)?.body;
        if (furniture && bodyHits(body, cell, furniture)) return true;
        const value = readCell(map.store, cell);
        const block = blockInfo(map, value);
        if (!block) continue;
        if (y === feetLevel && block.shape === 'stairs') continue;
        const hit = shapeBoxes(block.shape, cellRotation(value)).some((box) =>
          bodyHits(body, cell, box),
        );
        if (hit) return true;
      }
    }
  }
  return false;
}

// Высота ног, если существо может стоять в позиции anchor (клетка ног с наименьшими x и z
// основания), иначе null. Условия — опора и просвет не ниже роста над всем основанием.
export function standHeight(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
  height = CREATURE_SIZES[size].height,
): number | null {
  if (!hasSupport(map, anchor, size)) return null;
  const body = creatureBody(map, anchor, size, height);
  if (bodyBlocked(map, body, anchor[1])) return null;
  return body.min[1];
}
