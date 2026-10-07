import type { Vec3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import type { CreatureSize } from '../creature.js';
import { cellDistance, FEET_PER_CELL } from '../distance.js';
import { standHeight } from '../standing.js';
import { createStepper } from '../step.js';
import { MinHeap } from './heap.js';

// Позиция, до которой можно дойти, цена пути до неё в футах и предыдущая позиция
// на этом пути (null у начальной) — по ним путь собирается без нового поиска.
export interface Reach {
  at: Vec3;
  cost: number;
  from: Vec3 | null;
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

// Общее ядро: без цели — Дейкстра (все позиции в пределах цены), с целью — A*.
// Эвристика — расстояние Чебышёва × 5 футов: любой шаг стоит не меньше 5 и сдвигает
// каждую ось не больше чем на 1, поэтому она не переоценивает и A* находит самый дешёвый путь.
function explore(
  map: MapState,
  start: Vec3,
  size: CreatureSize,
  maxCost: number,
  goal?: Vec3,
): { nodes: Map<string, Node>; closed: Set<string>; reached: boolean } {
  const nodes = new Map<string, Node>();
  const closed = new Set<string>();
  if (standHeight(map, start, size) === null) {
    return { nodes, closed, reached: false };
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
    if (key === goalKey) return { nodes, closed, reached: true };
    const node = nodes.get(key) as Node;
    for (const d of NEIGHBOURS) {
      const next: Vec3 = [
        node.at[0] + d[0],
        node.at[1] + d[1],
        node.at[2] + d[2],
      ];
      const cost = step(node.at, next);
      if (cost === null) continue;
      const total = node.cost + cost;
      if (total > maxCost) continue;
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
  return { nodes, closed, reached: false };
}

// Все позиции, до которых существо дойдёт, потратив не больше maxCost футов, — для
// подсветки «куда могу дойти». Начальная позиция входит с ценой 0; если в ней стоять
// нельзя — пустой список.
export function reachable(
  map: MapState,
  start: Vec3,
  size: CreatureSize,
  maxCost: number,
): Reach[] {
  const { nodes, closed } = explore(map, start, size, maxCost);
  return [...closed].map((key) => {
    const { at, cost, prev } = nodes.get(key) as Node;
    return {
      at,
      cost,
      from: prev === null ? null : (nodes.get(prev) as Node).at,
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
// нового поиска. null, если goal среди них нет. Предыдущая позиция любой из них
// тоже среди них: Дейкстра закрывает её раньше.
export function pathFromReach(
  reach: readonly Reach[],
  goal: Vec3,
): PathResult | null {
  const byKey = new Map(reach.map((r) => [keyOf(r.at), r]));
  const end = byKey.get(keyOf(goal));
  if (!end) return null;
  const path = trace(end, (r) =>
    r.from ? byKey.get(keyOf(r.from)) : undefined,
  );
  return { path, cost: end.cost };
}

// Самый дешёвый путь от start до goal (позиции привязки) или null: дойти нельзя,
// дороже maxCost или поиск упёрся в предел раскрытых позиций.
export function findPath(
  map: MapState,
  start: Vec3,
  goal: Vec3,
  size: CreatureSize,
  maxCost = Infinity,
): PathResult | null {
  const { nodes, reached } = explore(map, start, size, maxCost, goal);
  if (!reached) return null;
  const end = nodes.get(keyOf(goal)) as Node;
  const path = trace(end, (n) =>
    n.prev === null ? undefined : nodes.get(n.prev),
  );
  return { path, cost: end.cost };
}
