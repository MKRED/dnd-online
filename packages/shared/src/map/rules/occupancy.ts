import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import { creatureBody, type BodyBox, type CreatureSize } from './creature.js';

// Другие существа на пути (docs/dnd/movement.md): сквозь союзника можно пройти, сквозь
// остальных — только если они на два размера больше или меньше; закончить ход в чужом
// месте нельзя. ally — союзник того, кто ходит: в приложении это персонажи игроков друг
// другу (сторон у монстров и НПС нет).
export interface Occupant {
  at: Vec3;
  size: CreatureSize;
  ally: boolean;
}

// Касание гранями — не пересечение: соседние клетки не мешают друг другу.
const EPSILON = 1e-6;

export function boxesOverlap(a: BodyBox, b: BodyBox): boolean {
  return [0, 1, 2].every(
    (axis) =>
      Math.min(a.max[axis], b.max[axis]) - Math.max(a.min[axis], b.min[axis]) >
      EPSILON,
  );
}

// Существа, чьё место пересекает тело существа size в позиции anchor. Сравниваются тела
// целиком, а не клетки основания: монстр этажом выше не мешает.
export function occupantsAt(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
  occupants: readonly Occupant[],
): Occupant[] {
  const body = creatureBody(map, anchor, size);
  return occupants.filter((other) =>
    boxesOverlap(body, creatureBody(map, other.at, other.size)),
  );
}
