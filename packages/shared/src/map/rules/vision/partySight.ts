import type { Box3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import type { BodyBox } from '../creature.js';
import { bodySeen } from './bodySeen.js';
import { createMask, maskUnion, type CellMask } from './cellMask.js';
import { revealBody, visibleCells, type Viewer } from './visibleCells.js';

// Что видит группа сейчас (docs/plan/done/fog-of-war.md): клетки всех смотрящих вместе и
// клетки тел существ, которых видит хоть один из них. Скрытых мастером существ сюда
// не передают: их клетки открыл бы сам факт, что их видно.
export function partySight(
  map: MapState,
  viewers: readonly Viewer[],
  creatures: readonly BodyBox[],
  bounds: Box3,
): CellMask {
  const visible = createMask();
  for (const viewer of viewers) {
    maskUnion(visible, visibleCells(map, viewer, bounds));
  }
  for (const body of creatures) {
    if (bodySeen(map, viewers, body)) revealBody(map, visible, body);
  }
  return visible;
}
