import { getBlock, MATERIALS, type BlockDefinition } from '../blocks.js';
import { cellRotation, cellTypeId } from '../cell.js';
import { readCell } from '../chunkStore.js';
import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import { shapeBoxes, type ShapeBox } from '../shapes.js';
import {
  CREATURE_SIZES,
  surfaceInCell,
  type CreatureSize,
} from './creature.js';
import { FEET_PER_CELL } from './distance.js';
import { standHeight } from './standing.js';

// Перепад высоты ног, который проходят шагом: плита, ступень.
const MAX_STEP = 0.5;
// По ступеням в сторону подъёма — до целого блока: соседние ступени лестницы стоят
// на блок выше друг друга.
const MAX_STAIRS_STEP = 1;

function blockAt(
  map: MapState,
  cell: Vec3,
): { block: BlockDefinition; boxes: readonly ShapeBox[] } | null {
  const value = readCell(map.store, cell);
  const block = getBlock(map.palette[cellTypeId(value)] ?? '');
  if (!block) return null;
  return { block, boxes: shapeBoxes(block.shape, cellRotation(value)) };
}

function footprintCells(anchor: Vec3, size: CreatureSize): Vec3[] {
  const n = Math.ceil(CREATURE_SIZES[size].footprint);
  const cells: Vec3[] = [];
  for (let dx = 0; dx < n; dx++) {
    for (let dz = 0; dz < n; dz++) {
      cells.push([anchor[0] + dx, anchor[1], anchor[2] + dz]);
    }
  }
  return cells;
}

// Направление подъёма ступеней по горизонтали — в сторону верхней ступени.
// Берём из повёрнутых коробок, а не из таблицы поворотов: так оно не разойдётся с формой.
function stairsAscent(boxes: readonly ShapeBox[]): [number, number] {
  const upper = boxes.find((box) => box[4] === 1 && box[1] > 0) ?? boxes[0];
  return [
    Math.sign((upper[0] + upper[3]) / 2 - 0.5),
    Math.sign((upper[2] + upper[5]) / 2 - 0.5),
  ];
}

// Подъём на целый блок — только прямо по ступеням: нижняя позиция стоит на ступенях,
// которые поднимаются в сторону шага.
function climbsStairs(
  map: MapState,
  lower: Vec3,
  dir: [number, number],
  size: CreatureSize,
): boolean {
  if (dir[0] !== 0 && dir[1] !== 0) return false;
  return footprintCells(lower, size).some((cell) => {
    const found = blockAt(map, cell);
    if (found?.block.shape !== 'stairs') return false;
    const [ax, az] = stairsAscent(found.boxes);
    return ax === dir[0] && az === dir[1];
  });
}

// Шаг без проверки углов: обе позиции допустимы, перепад высоты проходим.
function canMove(
  map: MapState,
  from: Vec3,
  to: Vec3,
  size: CreatureSize,
): boolean {
  const hFrom = standHeight(map, from, size);
  const hTo = standHeight(map, to, size);
  if (hFrom === null || hTo === null) return false;
  const rise = hTo - hFrom;
  if (Math.abs(rise) <= MAX_STEP) return true;
  if (Math.abs(rise) > MAX_STAIRS_STEP) return false;
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  return rise > 0
    ? climbsStairs(map, from, [dx, dz], size)
    : climbsStairs(map, to, [-dx, -dz], size);
}

// Углы не срезаются: по диагонали можно, только если можно пройти и через каждую из
// двух соседних прямых клеток (на уровне начала или конца шага).
function cornerClear(
  map: MapState,
  from: Vec3,
  to: Vec3,
  size: CreatureSize,
): boolean {
  const levels = [...new Set([from[1], to[1]])];
  const sides: [number, number][] = [
    [to[0], from[2]],
    [from[0], to[2]],
  ];
  return sides.every(([x, z]) =>
    levels.some((y) => {
      const mid: Vec3 = [x, y, z];
      return canMove(map, from, mid, size) && canMove(map, mid, to, size);
    }),
  );
}

// Труднопроходимая местность — если хоть под одной клеткой основания опора из такого
// материала (плита или ступени в самой клетке, иначе полный блок под ней).
function terrainCost(map: MapState, anchor: Vec3, size: CreatureSize): number {
  let cost = 1;
  for (const cell of footprintCells(anchor, size)) {
    const support: Vec3 =
      surfaceInCell(map, cell) > 0 ? cell : [cell[0], cell[1] - 1, cell[2]];
    const found = blockAt(map, support);
    if (found)
      cost = Math.max(cost, MATERIALS[found.block.material].movementCost);
  }
  return cost;
}

// Стоимость шага в футах в соседнюю позицию (клетка привязки сдвигается на 1 по x и/или z,
// уровень — на −1…1), или null, если так не пройти. Диагональ стоит как прямой шаг.
export function stepCost(
  map: MapState,
  from: Vec3,
  to: Vec3,
  size: CreatureSize,
): number | null {
  const d = [0, 1, 2].map((a) => to[a] - from[a]);
  if (d.some((v) => Math.abs(v) > 1)) return null;
  if (d[0] === 0 && d[2] === 0) return null;
  if (!canMove(map, from, to, size)) return null;
  if (d[0] !== 0 && d[2] !== 0 && !cornerClear(map, from, to, size)) {
    return null;
  }
  return FEET_PER_CELL * terrainCost(map, to, size);
}
