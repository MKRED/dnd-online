import type { Vec3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import type { CreatureSize } from '../creature.js';
import { cellDistance, FEET_PER_CELL } from '../distance.js';
import { crowdAt, type Crowd, type Occupant } from '../occupancy.js';
import { standHeight } from '../standing.js';
import { CLIMB_EXTRA_FEET, createStepper, type Step } from '../step.js';
import { MinHeap } from './heap.js';

// Позиция, до которой можно дойти, цена пути до неё в футах и предыдущая позиция
// на этом пути (null у начальной) — по ним путь собирается без нового поиска.
export interface Reach {
  at: Vec3;
  cost: number;
  from: Vec3 | null;
  // Здесь можно закончить ход: false — чужое место, сквозь которое путь только идёт.
  end: boolean;
}

// Запас движения по скоростям, в футах: walk — обычная Скорость, climb — скорость
// лазания (null — её нет). Число вместо него — только обычная Скорость.
export interface MoveAllowance {
  walk: number;
  climb: number | null;
}

export interface PathResult {
  // От начала до цели включительно.
  path: Vec3[];
  cost: number;
}

// Соседние позиции: 8 направлений по горизонтали, уровень −1…1.
const NEIGHBOURS: Vec3[] = [];
for (let dx = -1; dx <= 1; dx++) {
  for (let dz = -1; dz <= 1; dz++) {
    if (dx === 0 && dz === 0) continue;
    for (let dy = -1; dy <= 1; dy++) NEIGHBOURS.push([dx, dy, dz]);
  }
}

// Предел раскрытых позиций: без него поиск к недостижимой цели без предела цены
// обошёл бы всю карту.
const MAX_EXPANDED = 50_000;

interface Node {
  at: Vec3;
  cost: number;
  // Геометрическая длина пути в клетках (диагональ — √2): второй ключ после цены.
  len: number;
  prev: string | null;
}

// Диагональ по правилам стоит как прямой шаг, поэтому путей одной цены много:
// зигзаг вбок и обратно стоит столько же, сколько прямая. Из равных по цене берём
// самый короткий на самом деле — он и выглядит естественно. На цену и на то, куда
// можно дойти, это не влияет.
const stepLength = (d: Vec3) => Math.hypot(d[0], d[1], d[2]);

const keyOf = (at: Vec3) => at.join(',');

const allowanceOf = (max: number | MoveAllowance): MoveAllowance =>
  typeof max === 'number' ? { walk: max, climb: null } : max;

// Потрачено после шага или null, если запаса не хватает. Скорости меняются на ходу:
// из новой вычитается уже пройденное (глоссарий 2024, Speed), поэтому предел каждой
// проверяется по общей сумме. Подъём на уступ скоростью лазания — без лишних футов, но
// в её пределах; иначе лазание за счёт обычной Скорости. Остальное — обычная Скорость.
function spentAfter(
  spent: number,
  feet: number,
  step: Step,
  limits: MoveAllowance,
): number | null {
  if (step.kind === 'climb') {
    if (limits.climb !== null && spent + feet <= limits.climb) {
      return spent + feet;
    }
    feet += CLIMB_EXTRA_FEET;
  }
  return spent + feet <= limits.walk ? spent + feet : null;
}

// Другие существа на позициях пути, с кэшем: поиск проверяет одну позицию для каждого
// из соседей (docs/dnd/movement.md).
function createCrowd(
  map: MapState,
  size: CreatureSize,
  others: readonly Occupant[],
): (at: Vec3) => Crowd {
  const free: Crowd = { pass: true, difficult: false, free: true };
  const cache = new Map<string, Crowd>();
  return (at) => {
    if (others.length === 0) return free;
    const key = keyOf(at);
    let crowd = cache.get(key);
    if (!crowd) {
      crowd = crowdAt(map, at, size, others);
      cache.set(key, crowd);
    }
    return crowd;
  };
}

// Общее ядро: без цели — Дейкстра (все позиции в пределах цены), с целью — A*.
// Эвристика — расстояние Чебышёва × 5 футов: любой шаг стоит не меньше 5 и сдвигает
// каждую ось не больше чем на 1, поэтому она не переоценивает и A* находит самый дешёвый путь.
function explore(
  map: MapState,
  start: Vec3,
  size: CreatureSize,
  limits: MoveAllowance,
  others: readonly Occupant[],
  goal?: Vec3,
): {
  nodes: Map<string, Node>;
  closed: Set<string>;
  reached: boolean;
  crowd: (at: Vec3) => Crowd;
} {
  const nodes = new Map<string, Node>();
  const closed = new Set<string>();
  const crowd = createCrowd(map, size, others);
  if (standHeight(map, start, size) === null) {
    return { nodes, closed, reached: false, crowd };
  }
  const step = createStepper(map, size);
  const goalKey = goal && keyOf(goal);
  const estimate = (at: Vec3) =>
    goal ? cellDistance(at, goal) * FEET_PER_CELL : 0;
  const heap = new MinHeap<string>();
  nodes.set(keyOf(start), { at: start, cost: 0, len: 0, prev: null });
  heap.push(keyOf(start), estimate(start), 0);

  while (heap.size > 0 && closed.size < MAX_EXPANDED) {
    const key = heap.pop() as string;
    if (closed.has(key)) continue;
    closed.add(key);
    if (key === goalKey) return { nodes, closed, reached: true, crowd };
    const node = nodes.get(key) as Node;
    for (const d of NEIGHBOURS) {
      const next: Vec3 = [
        node.at[0] + d[0],
        node.at[1] + d[1],
        node.at[2] + d[2],
      ];
      const move = step(node.at, next);
      if (move === null) continue;
      const near = crowd(next);
      if (!near.pass) continue;
      // Чужое место — труднопроходимая местность; с другой труднопроходимостью
      // не складывается (а с лазанием — складывается, это в spentAfter).
      const feet = near.difficult
        ? Math.max(move.feet, 2 * FEET_PER_CELL)
        : move.feet;
      const total = spentAfter(node.cost, feet, move, limits);
      if (total === null) continue;
      const len = node.len + stepLength(d);
      const nextKey = keyOf(next);
      const known = nodes.get(nextKey);
      if (
        known &&
        (known.cost < total || (known.cost === total && known.len <= len))
      ) {
        continue;
      }
      nodes.set(nextKey, { at: next, cost: total, len, prev: key });
      heap.push(nextKey, total + estimate(next), len);
    }
  }
  return { nodes, closed, reached: false, crowd };
}

// Все позиции, до которых существо дойдёт в пределах запаса maxCost, — для
// подсветки «куда могу дойти». Начальная позиция входит с ценой 0; если в ней стоять
// нельзя — пустой список. others — другие существа: сквозь их место путь идёт, где
// правила пускают, но закончить ход там нельзя — у таких позиций end = false.
export function reachable(
  map: MapState,
  start: Vec3,
  size: CreatureSize,
  maxCost: number | MoveAllowance,
  others: readonly Occupant[] = [],
): Reach[] {
  const { nodes, closed, crowd } = explore(
    map,
    start,
    size,
    allowanceOf(maxCost),
    others,
  );
  const startKey = keyOf(start);
  return [...closed].map((key) => {
    const { at, cost, prev } = nodes.get(key) as Node;
    return {
      at,
      cost,
      from: prev === null ? null : (nodes.get(prev) as Node).at,
      // Начальная позиция — своя, даже если там уже кто-то стоит.
      end: key === startKey || crowd(at).free,
    };
  });
}

// Путь по цепочке предыдущих позиций от goal назад к началу.
function trace<T extends { at: Vec3 }>(
  goal: T,
  prevOf: (node: T) => T | undefined,
): Vec3[] {
  const path: Vec3[] = [];
  for (let node: T | undefined = goal; node; node = prevOf(node)) {
    path.push(node.at);
  }
  return path.reverse();
}

// Путь до goal по результату reachable — для подсветки пути под курсором без
// нового поиска. null, если goal среди них нет или там нельзя остановиться.
// Предыдущая позиция любой из них тоже среди них: Дейкстра закрывает её раньше.
export function pathFromReach(
  reach: readonly Reach[],
  goal: Vec3,
): PathResult | null {
  const byKey = new Map(reach.map((r) => [keyOf(r.at), r]));
  const end = byKey.get(keyOf(goal));
  if (!end?.end) return null;
  const path = trace(end, (r) =>
    r.from ? byKey.get(keyOf(r.from)) : undefined,
  );
  return { path, cost: end.cost };
}

// Самый дешёвый путь от start до goal (позиции привязки) или null: дойти нельзя,
// дороже maxCost, goal занята другим существом или поиск упёрся в предел раскрытых
// позиций.
export function findPath(
  map: MapState,
  start: Vec3,
  goal: Vec3,
  size: CreatureSize,
  maxCost: number | MoveAllowance = Infinity,
  others: readonly Occupant[] = [],
): PathResult | null {
  const { nodes, reached, crowd } = explore(
    map,
    start,
    size,
    allowanceOf(maxCost),
    others,
    goal,
  );
  if (!reached || !crowd(goal).free) return null;
  const end = nodes.get(keyOf(goal)) as Node;
  const path = trace(end, (n) =>
    n.prev === null ? undefined : nodes.get(n.prev),
  );
  return { path, cost: end.cost };
}
