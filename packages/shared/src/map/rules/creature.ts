import { cellRotation, cellTypeId } from '../cell.js';
import { getBlock } from '../blocks.js';
import { readCell } from '../chunkStore.js';
import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import { shapeBoxes } from '../shapes.js';

// Точка в непрерывных координатах карты: клетка [x, y, z] занимает [x, x+1) по каждой оси.
export type Point3 = readonly [x: number, y: number, z: number];

// Непрерывная коробка, в отличие от Box3 из клеток.
export interface BodyBox {
  min: Point3;
  max: Point3;
}

export type CreatureSize =
  'tiny' | 'small' | 'medium' | 'large' | 'huge' | 'gargantuan';

// Основание — по правилам D&D, рост — визуальный и одновременно нужный просвет
// (таблица «Рост существ» в docs/map.md).
export const CREATURE_SIZES: Record<
  CreatureSize,
  { label: string; footprint: number; height: number }
> = {
  tiny: { label: 'Крошечный', footprint: 0.5, height: 1 },
  small: { label: 'Маленький', footprint: 1, height: 1 },
  medium: { label: 'Средний', footprint: 1, height: 2 },
  large: { label: 'Большой', footprint: 2, height: 3 },
  huge: { label: 'Огромный', footprint: 3, height: 4 },
  gargantuan: { label: 'Громадный', footprint: 4, height: 6 },
};

// Опора внутри клетки (0…1): верх коробки во всю площадь клетки. Тонкая стена и
// столб опорой не считаются — существо стоит рядом с ними, а не на них.
function surfaceInCell(map: MapState, cell: Vec3): number {
  const value = readCell(map.store, cell);
  const block = getBlock(map.palette[cellTypeId(value)] ?? '');
  if (!block) return 0;
  const floors = shapeBoxes(block.shape, cellRotation(value)).filter(
    ([minX, , minZ, maxX, , maxZ]) =>
      minX === 0 && minZ === 0 && maxX === 1 && maxZ === 1,
  );
  return Math.max(0, ...floors.map((box) => box[4]));
}

// Высота ног: существо, стоящее в клетке с плитой или ступенями, стоит на их верху,
// а не на дне клетки (на ступенях — на нижней ступени, +0,5). Для основания из нескольких клеток берём самую высокую опору.
export function feetHeight(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
): number {
  const cells = Math.ceil(CREATURE_SIZES[size].footprint);
  let top = 0;
  for (let dx = 0; dx < cells; dx++) {
    for (let dz = 0; dz < cells; dz++) {
      const cell: Vec3 = [anchor[0] + dx, anchor[1], anchor[2] + dz];
      top = Math.max(top, surfaceInCell(map, cell));
    }
  }
  return anchor[1] + top;
}

// Тело существа — сплошная коробка: основание × [высота ног, + рост]. anchor — клетка
// ног с наименьшими x и z основания. Крошечное занимает середину своей клетки.
export function creatureBody(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
  height = CREATURE_SIZES[size].height,
): BodyBox {
  const { footprint } = CREATURE_SIZES[size];
  const offset = footprint < 1 ? (1 - footprint) / 2 : 0;
  const feet = feetHeight(map, anchor, size);
  const x = anchor[0] + offset;
  const z = anchor[2] + offset;
  return {
    min: [x, feet, z],
    max: [x + footprint, feet + height, z + footprint],
  };
}
