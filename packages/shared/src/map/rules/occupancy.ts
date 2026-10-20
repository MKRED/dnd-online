import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import {
  CREATURE_SIZES,
  creatureBody,
  type BodyBox,
  type CreatureSize,
} from './creature.js';

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

const SIZE_ORDER = Object.keys(CREATURE_SIZES) as CreatureSize[];

// Сквозь чьё место можно пройти: союзника, Крошечного и того, кто на два размера больше
// или меньше. Недееспособного — когда у существ появится состояние (этап 8 плана игры).
export function canPassThrough(size: CreatureSize, other: Occupant): boolean {
  if (other.ally || other.size === 'tiny') return true;
  const gap = Math.abs(
    SIZE_ORDER.indexOf(size) - SIZE_ORDER.indexOf(other.size),
  );
  return gap >= 2;
}

// Чужое место — труднопроходимая местность, если там не союзник и не Крошечный.
export function isDifficultSpace(other: Occupant): boolean {
  return !other.ally && other.size !== 'tiny';
}

// Что другие существа значат для позиции на пути: pass — пройти можно, difficult — шаг
// стоит вдвое (не складывается с местностью), free — здесь можно остановиться.
export interface Crowd {
  pass: boolean;
  difficult: boolean;
  free: boolean;
}

export function crowdAt(
  map: MapState,
  anchor: Vec3,
  size: CreatureSize,
  occupants: readonly Occupant[],
): Crowd {
  const here = occupantsAt(map, anchor, size, occupants);
  return {
    pass: here.every((other) => canPassThrough(size, other)),
    difficult: here.some(isDifficultSpace),
    free: here.length === 0,
  };
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
