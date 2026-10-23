import {
  AIR_NAME,
  boxFromCorners,
  cellTypeId,
  getBlock,
  insideMap,
  parseCustomBlockName,
  readCell,
  type Box3,
  type BlockOp,
  type SizedMapState,
  type Vec3,
} from 'shared';

// Режимы ластика: блок — один клик; плоскость и область — два угла; связное — всё,
// что соединено с блоком под курсором и сделано из того же материала.
export const ERASE_MODES = ['block', 'plane', 'region', 'connected'] as const;
export type EraseMode = (typeof ERASE_MODES)[number];

export const ERASE_MODE_LABELS: Record<EraseMode, string> = {
  block: 'Блок',
  plane: 'Плоскость',
  region: 'Область',
  connected: 'Связное',
};

export const nextEraseMode = (mode: EraseMode): EraseMode =>
  ERASE_MODES[(ERASE_MODES.indexOf(mode) + 1) % ERASE_MODES.length];

// Порядок осей при равенстве: сначала y (пол), потом z и x (стена).
const PLANE_AXES = [1, 2, 0] as const;

// Плоскость — прямоугольник толщиной в клетку между двумя углами: стена или пол
// (решено с пользователем 2026-10-22: один режим, плоскость определяется сама). Толщину
// получает ось, вдоль которой клики разошлись меньше всего, — её второй угол берёт
// у первого. Клики на одном уровне — пол, на одной линии плана — стена; косой клик
// не стирает лишнего.
export function planeBox(a: Vec3, b: Vec3): Box3 {
  const spread = (axis: number) => Math.abs(b[axis] - a[axis]);
  const flat = PLANE_AXES.reduce((best, axis) =>
    spread(axis) < spread(best) ? axis : best,
  );
  const end = b.map((v, axis) =>
    axis === flat ? a[axis] : v,
  ) as unknown as Vec3;
  return boxFromCorners(a, end);
}

// Связное стирание: сколько клеток самое большее обходим. Больше — это уже пол всей
// карты, а не постройка, и вкладка не должна подвисать на одном клике.
export const CONNECTED_LIMIT = 32_768;
// Столько операций сервер принимает в одной пачке (MAP_MAX_OPS_PER_BATCH по умолчанию).
export const MAX_ERASE_BOXES = 100;

const NEIGHBOURS: readonly Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

const key = ([x, y, z]: Vec3) => `${x},${y},${z}`;

function materialAt(state: SizedMapState, cell: Vec3): string | null {
  const typeId = cellTypeId(readCell(state.store, cell));
  const name = state.palette[typeId];
  if (!name || name === AIR_NAME) return null;
  // Своя группа — один «материал» во всех формах, как камень со ступенями
  // (docs/plan/blocks.md, этап 6а).
  return (
    parseCustomBlockName(name)?.groupId ?? getBlock(name)?.material ?? name
  );
}

// Клетки, соединённые гранями с start и того же материала: ступени и плиты из камня —
// часть каменной стены. null — блока нет или постройка больше CONNECTED_LIMIT.
export function connectedCells(
  state: SizedMapState,
  start: Vec3,
): Vec3[] | null {
  const material = materialAt(state, start);
  if (!material) return null;
  const seen = new Set([key(start)]);
  const cells: Vec3[] = [start];
  for (let i = 0; i < cells.length; i++) {
    const [x, y, z] = cells[i];
    for (const [dx, dy, dz] of NEIGHBOURS) {
      const next: Vec3 = [x + dx, y + dy, z + dz];
      const id = key(next);
      if (seen.has(id) || !insideMap(next, state.size)) continue;
      seen.add(id);
      if (materialAt(state, next) !== material) continue;
      if (cells.length >= CONNECTED_LIMIT) return null;
      cells.push(next);
    }
  }
  return cells;
}

// Клетки складываются в коробки жадно: ряд по x, потом ряды одной длины по z, потом
// такие же слои по y. Коробки лежат только на этих клетках, так что стирание коробками
// не задевает соседние блоки.
export function packBoxes(cells: readonly Vec3[]): Box3[] {
  const left = new Set(cells.map(key));
  const has = (x: number, y: number, z: number) => left.has(`${x},${y},${z}`);
  const sorted = [...cells].sort(
    (a, b) => a[1] - b[1] || a[2] - b[2] || a[0] - b[0],
  );
  const boxes: Box3[] = [];
  for (const [x0, y0, z0] of sorted) {
    if (!has(x0, y0, z0)) continue;
    let x1 = x0;
    while (has(x1 + 1, y0, z0)) x1++;
    const row = (y: number, z: number) => {
      for (let x = x0; x <= x1; x++) if (!has(x, y, z)) return false;
      return true;
    };
    let z1 = z0;
    while (row(y0, z1 + 1)) z1++;
    const layer = (y: number) => {
      for (let z = z0; z <= z1; z++) if (!row(y, z)) return false;
      return true;
    };
    let y1 = y0;
    while (layer(y1 + 1)) y1++;
    for (let y = y0; y <= y1; y++)
      for (let z = z0; z <= z1; z++)
        for (let x = x0; x <= x1; x++) left.delete(`${x},${y},${z}`);
    boxes.push({ min: [x0, y0, z0], max: [x1, y1, z1] });
  }
  return boxes;
}

export const eraseBoxOp = ({ min, max }: Box3): BlockOp =>
  min.every((v, axis) => v === max[axis])
    ? { op: 'setBlock', at: min, block: AIR_NAME }
    : { op: 'fillBox', from: min, to: max, block: AIR_NAME };

// Операции связного стирания или текст, почему его не будет.
export function connectedEraseOps(
  state: SizedMapState,
  start: Vec3,
): BlockOp[] | string {
  const cells = connectedCells(state, start);
  if (!cells) {
    return 'Постройка слишком большая для связного стирания — сотрите её областью.';
  }
  const boxes = packBoxes(cells);
  if (boxes.length > MAX_ERASE_BOXES) {
    return 'Постройка слишком сложная для одного стирания — сотрите её по частям областью или стеной.';
  }
  return boxes.map(eraseBoxOp);
}
