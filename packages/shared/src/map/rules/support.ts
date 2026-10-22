import { blockInfo, type BlockInfo } from '../blockInfo.js';
import { cellRotation } from '../cell.js';
import { readCell } from '../chunkStore.js';
import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import type { MaterialHazard } from '../materialHazards.js';
import type { MaterialName } from '../materials.js';
import { shapeBoxes, type ShapeBox } from '../shapes.js';
import {
  CREATURE_SIZES,
  surfaceInCell,
  type CreatureSize,
} from './creature.js';

export function blockAt(
  map: MapState,
  cell: Vec3,
): { block: BlockInfo; boxes: readonly ShapeBox[] } | null {
  const value = readCell(map.store, cell);
  const block = blockInfo(map, value);
  if (!block) return null;
  return { block, boxes: shapeBoxes(block.shape, cellRotation(value)) };
}

export function footprintCells(anchor: Vec3, size: CreatureSize): Vec3[] {
  const n = Math.ceil(CREATURE_SIZES[size].footprint);
  const cells: Vec3[] = [];
  for (let dx = 0; dx < n; dx++) {
    for (let dz = 0; dz < n; dz++) {
      cells.push([anchor[0] + dx, anchor[1], anchor[2] + dz]);
    }
  }
  return cells;
}

// Опора под основанием существа, по одному блоку на материал: плита или ступени в
// самой клетке, иначе полный блок под ней. Из неё берутся труднопроходимость и опасность.
export function supportBlocks(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
): BlockInfo[] {
  const found = new Map<MaterialName, BlockInfo>();
  for (const cell of footprintCells(anchor, size)) {
    const support: Vec3 =
      surfaceInCell(map, cell) > 0 ? cell : [cell[0], cell[1] - 1, cell[2]];
    const block = blockAt(map, support)?.block;
    if (block && !found.has(block.material)) found.set(block.material, block);
  }
  return [...found.values()];
}

export function supportMaterials(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
): MaterialName[] {
  return supportBlocks(map, anchor, size).map((block) => block.material);
}

// Опасности под существом: Большой на краю лавы горит, даже если стоит на ней одной
// клеткой основания. Урон наносит бой, здесь — только что под ногами.
export function hazardsUnder(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
): { material: MaterialName; hazard: MaterialHazard }[] {
  return supportBlocks(map, anchor, size).flatMap(({ material, traits }) => {
    const hazard: MaterialHazard | null = traits.hazard;
    return hazard ? [{ material, hazard }] : [];
  });
}
