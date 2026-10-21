import { getBlock, type BlockDefinition } from '../blocks.js';
import { cellRotation, cellTypeId } from '../cell.js';
import { readCell } from '../chunkStore.js';
import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import type { MaterialHazard } from '../materialHazards.js';
import { MATERIALS, type MaterialName } from '../materials.js';
import { shapeBoxes, type ShapeBox } from '../shapes.js';
import {
  CREATURE_SIZES,
  surfaceInCell,
  type CreatureSize,
} from './creature.js';

export function blockAt(
  map: MapState,
  cell: Vec3,
): { block: BlockDefinition; boxes: readonly ShapeBox[] } | null {
  const value = readCell(map.store, cell);
  const block = getBlock(map.palette[cellTypeId(value)] ?? '');
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

// Материалы опоры под основанием существа, без повторов: плита или ступени в самой
// клетке, иначе полный блок под ней. Из них берутся труднопроходимость и опасность.
export function supportMaterials(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
): MaterialName[] {
  const found = new Set<MaterialName>();
  for (const cell of footprintCells(anchor, size)) {
    const support: Vec3 =
      surfaceInCell(map, cell) > 0 ? cell : [cell[0], cell[1] - 1, cell[2]];
    const block = blockAt(map, support);
    if (block) found.add(block.block.material);
  }
  return [...found];
}

// Опасности под существом: Большой на краю лавы горит, даже если стоит на ней одной
// клеткой основания. Урон наносит бой, здесь — только что под ногами.
export function hazardsUnder(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
): { material: MaterialName; hazard: MaterialHazard }[] {
  return supportMaterials(map, anchor, size).flatMap((material) => {
    const hazard: MaterialHazard | null = MATERIALS[material].hazard;
    return hazard ? [{ material, hazard }] : [];
  });
}
