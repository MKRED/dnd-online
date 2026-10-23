import { blockInfo } from '../blockInfo.js';
import { readCell } from '../chunkStore.js';
import type { Box3, Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import { MapOpError } from '../mapOpError.js';
import { surfaceInCell } from '../rules/creature.js';
import type { Facing, MapObject, MapObjects } from './mapObject.js';
import { objectBox, type ObjectRefs } from './objectRefs.js';

// Клетка модели [x, y, z] → сдвиг от опорной клетки обстановки, повёрнутой на facing.
// По часовой, если смотреть сверху: на 90° север модели («вперёд») смотрит на восток —
// как поворот в редакторе моделей (rotateGrid).
export function rotateModelCell(
  [mx, my, mz]: Vec3,
  [sx, , sz]: Vec3,
  facing: Facing,
): Vec3 {
  switch (facing) {
    case 90:
      return [sz - 1 - mz, my, mx];
    case 180:
      return [sx - 1 - mx, my, sz - 1 - mz];
    case 270:
      return [mz, my, sx - 1 - mx];
    default:
      return [mx, my, mz];
  }
}

// Шаг «за спину» обстановки: спина — сторона, противоположная «вперёд».
const BACK: Record<number, [number, number]> = {
  0: [0, 1],
  90: [-1, 0],
  180: [0, -1],
  270: [1, 0],
};

function* boxCells({ min, max }: Box3): Generator<Vec3> {
  for (let y = min[1]; y <= max[1]; y++)
    for (let z = min[2]; z <= max[2]; z++)
      for (let x = min[0]; x <= max[0]; x++) yield [x, y, z];
}

const inside = (cell: Vec3, { min, max }: Box3) =>
  cell.every((v, axis) => v >= min[axis] && v <= max[axis]);

const boxesMeet = (a: Box3, b: Box3) =>
  [0, 1, 2].every(
    (axis) => a.min[axis] <= b.max[axis] && b.min[axis] <= a.max[axis],
  );

const hasBlock = (world: MapState, cell: Vec3) =>
  blockInfo(world, readCell(world.store, cell)) !== null;

const cellText = (cell: Vec3) => `[${cell.join(', ')}]`;

// Можно ли встать на эту клетку сверху: клетка другой обстановки со свойством «можно
// встать сверху» (свеча на столе).
function standableFurniture(
  objects: MapObjects,
  refs: ObjectRefs,
  self: number,
  cell: Vec3,
): boolean {
  for (const other of objects.byId.values()) {
    if (other.id === self || other.kind !== 'furniture') continue;
    const ref = refs.furniture.get(other.furnitureId);
    if (!ref || !inside(cell, objectBox(other, refs))) continue;
    for (const [key, kind] of Object.entries(ref.cells)) {
      if (kind !== 'stand') continue;
      const offset = rotateModelCell(
        key.split(',').map(Number) as unknown as Vec3,
        ref.size,
        other.facing,
      );
      if (offset.every((v, axis) => other.at[axis] + v === cell[axis]))
        return true;
    }
  }
  return false;
}

// Строгие пересечения (docs/plan/blocks.md, «Пересечения»): в клетках обстановки нет ни
// блоков, ни других объектов; на полу — опора под каждой нижней клеткой (блок с верхом
// во всю клетку или верх обстановки, где можно встать), на стене — блок за спиной у
// каждой клетки спины, на потолке — блок над каждой верхней клеткой. С force (Shift+клик) не
// проверяется.
export function assertFurnitureFits(
  world: MapState,
  objects: MapObjects,
  refs: ObjectRefs,
  object: MapObject & { kind: 'furniture' },
): void {
  const ref = refs.furniture.get(object.furnitureId);
  const box = objectBox(object, refs);
  const fail = (text: string): never => {
    throw new MapOpError(`${text} — с Shift обстановка ставится без проверки`);
  };
  for (const cell of boxCells(box))
    if (hasBlock(world, cell))
      fail(`Обстановке мешает блок в клетке ${cellText(cell)}`);
  for (const other of objects.byId.values()) {
    if (other.id !== object.id && boxesMeet(box, objectBox(other, refs)))
      fail(`Обстановке мешает объект #${other.id}`);
  }
  const mount = ref?.mount ?? 'floor';
  const [x0, y0, z0] = box.min;
  const [x1, y1, z1] = box.max;
  if (mount === 'floor') {
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++) {
        const below: Vec3 = [x, y0 - 1, z];
        if (
          surfaceInCell(world, below) < 1 &&
          !standableFurniture(objects, refs, object.id, below)
        )
          fail(
            `Обстановке на полу нужна опора: под клеткой ${cellText([x, y0, z])} её нет`,
          );
      }
  } else if (mount === 'ceiling') {
    for (let z = z0; z <= z1; z++)
      for (let x = x0; x <= x1; x++)
        if (!hasBlock(world, [x, y1 + 1, z]))
          fail(
            `Обстановке на потолке нужен блок над клеткой ${cellText([x, y1, z])}`,
          );
  } else {
    const [dx, dz] = BACK[object.facing];
    for (const cell of boxCells(box)) {
      const behind: Vec3 = [cell[0] + dx, cell[1], cell[2] + dz];
      // Клетки спины — те, за которыми уже не сама обстановка.
      if (inside(behind, box)) continue;
      if (!hasBlock(world, behind))
        fail(
          `Обстановке на стене нужен блок за спиной клетки ${cellText(cell)}`,
        );
    }
  }
}
