import type { Vec3 } from '../coords.js';
import type { MapState } from '../mapState.js';
import { MATERIALS } from '../materials.js';
import type { ShapeBox } from '../shapes.js';
import { CREATURE_SIZES, type CreatureSize } from './creature.js';
import { FEET_PER_CELL } from './distance.js';
import { standHeight } from './standing.js';
import { blockAt, footprintCells, supportMaterials } from './support.js';

// Перепад высоты ног, который проходят шагом: плита, ступень.
const MAX_STEP = 0.5;
// По ступеням в сторону подъёма и на уступ — до целого блока: соседние ступени
// лестницы стоят на блок выше друг друга.
const MAX_LEDGE = 1;

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

// Высота ног по позиции (standHeight) — поиск пути вызывает её для одной позиции
// много раз, поэтому её можно подменить кэшем.
type StandFn = (anchor: Vec3) => number | null;

// Как пройден шаг: обычным шагом (по ровному, по ступеням, прыжком вниз с уступа)
// или лазанием на уступ — за лазание платят лишние футы (docs/dnd/movement.md).
export type StepKind = 'walk' | 'climb';

// Шаг без проверки углов: обе позиции допустимы, перепад высоты проходим; null — нет.
// ledge — можно ли через уступ в целый блок без ступеней: проверка углов его не берёт,
// иначе диагональ срезала бы угол через кочку высотой в блок.
function canMove(
  map: MapState,
  stand: StandFn,
  from: Vec3,
  to: Vec3,
  size: CreatureSize,
  ledge = true,
): StepKind | null {
  const hFrom = stand(from);
  const hTo = stand(to);
  if (hFrom === null || hTo === null) return null;
  const rise = hTo - hFrom;
  if (Math.abs(rise) <= MAX_STEP) return 'walk';
  if (Math.abs(rise) > MAX_LEDGE) return null;
  const dx = to[0] - from[0];
  const dz = to[2] - from[2];
  const stairs =
    rise > 0
      ? climbsStairs(map, from, [dx, dz], size)
      : climbsStairs(map, to, [-dx, -dz], size);
  if (stairs) return 'walk';
  if (!ledge || (dx !== 0 && dz !== 0)) return null;
  // Уступ — только прямо: вверх лазанием, вниз прыжком (5 футов падения урона не дают).
  // Тело переваливает через край, поэтому над нижней позицией нужен просвет на блок
  // выше роста — под низким потолком на уступ не забраться.
  const lower = rise > 0 ? from : to;
  const clear = standHeight(map, lower, size, CREATURE_SIZES[size].height + 1);
  if (clear === null) return null;
  return rise > 0 ? 'climb' : 'walk';
}

// Углы не срезаются: по диагонали можно, только если можно пройти и через каждую из
// двух соседних прямых клеток (на уровне начала или конца шага).
function cornerClear(
  map: MapState,
  stand: StandFn,
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
      return (
        canMove(map, stand, from, mid, size, false) !== null &&
        canMove(map, stand, mid, to, size, false) !== null
      );
    }),
  );
}

// Труднопроходимая местность — если хоть под одной клеткой основания опора из такого
// материала (supportMaterials).
function terrainCost(map: MapState, anchor: Vec3, size: CreatureSize): number {
  return Math.max(
    1,
    ...supportMaterials(map, anchor, size).map(
      (m) => MATERIALS[m].movementCost,
    ),
  );
}

// Шаг: цена в футах без лишних футов лазания (их добавляет поиск — скорость лазания
// их снимает) и как он пройден.
export interface Step {
  feet: number;
  kind: StepKind;
}

export type Stepper = (from: Vec3, to: Vec3) => Step | null;

// Функция шага для одного существа на неизменной карте: высоты позиций кэшируются.
// Для поиска пути — там одна позиция проверяется для каждого из соседей.
export function createStepper(map: MapState, size: CreatureSize): Stepper {
  const heights = new Map<string, number | null>();
  const stand: StandFn = (anchor) => {
    const key = anchor.join(',');
    let h = heights.get(key);
    if (h === undefined) {
      h = standHeight(map, anchor, size);
      heights.set(key, h);
    }
    return h;
  };
  return (from, to) => {
    const d = [0, 1, 2].map((a) => to[a] - from[a]);
    if (d.some((v) => Math.abs(v) > 1)) return null;
    if (d[0] === 0 && d[2] === 0) return null;
    const kind = canMove(map, stand, from, to, size);
    if (kind === null) return null;
    if (d[0] !== 0 && d[2] !== 0 && !cornerClear(map, stand, from, to, size)) {
      return null;
    }
    return { feet: FEET_PER_CELL * terrainCost(map, to, size), kind };
  };
}

// Лишние футы лазания на уступ в блок: каждый фут подъёма стоит ещё фут (глоссарий 2024,
// Climbing), в том числе на труднопроходимой местности — там цена складывается.
export const CLIMB_EXTRA_FEET = FEET_PER_CELL;

// Стоимость шага в футах в соседнюю позицию (клетка привязки сдвигается на 1 по x и/или z,
// уровень — на −1…1) без скорости лазания, или null, если так не пройти. Диагональ стоит
// как прямой шаг.
export function stepCost(
  map: MapState,
  from: Vec3,
  to: Vec3,
  size: CreatureSize,
): number | null {
  const step = createStepper(map, size)(from, to);
  if (!step) return null;
  return step.feet + (step.kind === 'climb' ? CLIMB_EXTRA_FEET : 0);
}
