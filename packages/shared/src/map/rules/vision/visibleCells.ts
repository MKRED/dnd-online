import { AIR } from '../../cell.js';
import { readCell } from '../../chunkStore.js';
import {
  CHUNK_SIZE,
  localIndex,
  parseChunkKey,
  type Box3,
  type Vec3,
} from '../../coords.js';
import type { MapState } from '../../mapState.js';
import { eyePoints } from '../cover.js';
import type { BodyBox, Point3 } from '../creature.js';
import { pointInSolid, segmentBlocked } from '../segment.js';
import { createMask, maskAdd, type CellMask } from './cellMask.js';

// Кто смотрит: тело фигурки и дальность обзора в клетках. Дальность своя у каждого:
// сейчас это дальность сцены, потом её поменяют темнота, слепота, тёмное зрение
// (docs/dnd/vision.md). 0 — не видит ничего (без сознания).
export interface Viewer {
  body: BodyBox;
  rangeCells: number;
}

const NEIGHBOURS: readonly Vec3[] = [
  [1, 0, 0],
  [-1, 0, 0],
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
];

// Клетки, которые занимает непрерывная коробка (тело существа).
export function bodyCells(body: BodyBox): Box3 {
  const max = (v: number) => Math.ceil(v - 1e-9) - 1;
  return {
    min: [
      Math.floor(body.min[0]),
      Math.floor(body.min[1]),
      Math.floor(body.min[2]),
    ],
    max: [max(body.max[0]), max(body.max[1]), max(body.max[2])],
  };
}

function clip(box: Box3, bounds: Box3 | undefined): Box3 {
  if (!bounds) return box;
  const { min, max } = box;
  return {
    min: [
      Math.max(min[0], bounds.min[0]),
      Math.max(min[1], bounds.min[1]),
      Math.max(min[2], bounds.min[2]),
    ],
    max: [
      Math.min(max[0], bounds.max[0]),
      Math.min(max[1], bounds.max[1]),
      Math.min(max[2], bounds.max[2]),
    ],
  };
}

function grow({ min, max }: Box3, by: number): Box3 {
  return {
    min: [min[0] - by, min[1] - by, min[2] - by],
    max: [max[0] + by, max[1] + by, max[2] + by],
  };
}

export function viewerEyes(map: MapState, viewer: Viewer): Point3[] {
  return eyePoints(viewer.body).filter((p) => !pointInSolid(map, p));
}

// Что видит один смотрящий (docs/plan/fog-of-war.md, «Как считаем видимое»). Правило
// рогаликов: лучи идут только к воздуху у поверхности — клеткам воздуха, у которых
// сосед по грани не воздух (пол, клетка у стены). Воздух посреди зала ничего не
// показывает. Блок виден, если виден соседний с ним воздух: луч к центру самого
// блока упёрся бы в этот блок. bounds — клетки карты: за её пределами (под полом на
// y < 0) клеток нет, а лучи к ним упирались бы в пол всеми пятью глазами.
export function visibleCells(
  map: MapState,
  viewer: Viewer,
  bounds?: Box3,
): CellMask {
  const visible = createMask();
  const eyes = viewerEyes(map, viewer);
  if (eyes.length === 0 || viewer.rangeCells <= 0) return visible;
  // Чебышёв по трём осям, как дальность в правилах: «в пределах N клеток» — это куб.
  const area = clip(grow(bodyCells(viewer.body), viewer.rangeCells), bounds);
  if ([0, 1, 2].some((a) => area.min[a] > area.max[a])) return visible;
  const [ax, ay, az] = area.min;
  const sizeX = area.max[0] - ax + 1;
  const sizeY = area.max[1] - ay + 1;
  const sizeZ = area.max[2] - az + 1;
  // Проверенный воздух — плотная сетка по области: клеток много, ключ-строка на каждую
  // стоил бы дороже самих лучей.
  const tested = new Uint8Array(sizeX * sizeY * sizeZ);
  const seenAir: Vec3[] = [];

  const testAir = (x: number, y: number, z: number) => {
    const lx = x - ax;
    const ly = y - ay;
    const lz = z - az;
    if (
      lx < 0 ||
      ly < 0 ||
      lz < 0 ||
      lx >= sizeX ||
      ly >= sizeY ||
      lz >= sizeZ
    ) {
      return;
    }
    const index = lx + sizeX * (lz + sizeZ * ly);
    if (tested[index]) return;
    tested[index] = 1;
    if (readCell(map.store, [x, y, z]) !== AIR) return;
    const centre: Point3 = [x + 0.5, y + 0.5, z + 0.5];
    if (eyes.some((eye) => !segmentBlocked(map, eye, centre, 'sight'))) {
      seenAir.push([x, y, z]);
    }
  };

  // Блоки на клетку шире области: их воздух-соседи ещё в ней.
  const minCell = [ax - 1, ay - 1, az - 1];
  const maxCell = [area.max[0] + 1, area.max[1] + 1, area.max[2] + 1];
  for (const key of map.store.keys()) {
    const chunk = map.store.get(key);
    if (!chunk) continue;
    const base = parseChunkKey(key).map((c) => c * CHUNK_SIZE);
    // Пересечение чанка с областью в его локальных координатах.
    const from = [0, 1, 2].map((a) => Math.max(0, minCell[a] - base[a]));
    const to = [0, 1, 2].map((a) =>
      Math.min(CHUNK_SIZE - 1, maxCell[a] - base[a]),
    );
    if (from.some((f, a) => f > to[a])) continue;
    for (let ly = from[1]; ly <= to[1]; ly++) {
      for (let lz = from[2]; lz <= to[2]; lz++) {
        for (let lx = from[0]; lx <= to[0]; lx++) {
          if (chunk[localIndex(lx, ly, lz)] === AIR) continue;
          const x = base[0] + lx;
          const y = base[1] + ly;
          const z = base[2] + lz;
          for (const [dx, dy, dz] of NEIGHBOURS)
            testAir(x + dx, y + dy, z + dz);
        }
      }
    }
  }
  for (const air of seenAir) {
    maskAdd(visible, air);
    revealAround(map, visible, air);
  }
  return visible;
}

// Соседние с клеткой блоки становятся видны вместе с ней.
function revealAround(map: MapState, mask: CellMask, cell: Vec3): void {
  for (const [dx, dy, dz] of NEIGHBOURS) {
    const next: Vec3 = [cell[0] + dx, cell[1] + dy, cell[2] + dz];
    if (readCell(map.store, next) !== AIR) maskAdd(mask, next);
  }
}

// Клетки тела видимого существа и блоки вокруг них: иначе монстр, выглянувший из-за
// стены, стоял бы у игрока в пустоте — его клетки лучи могли и не достать.
export function revealBody(map: MapState, mask: CellMask, body: BodyBox) {
  const { min, max } = bodyCells(body);
  for (let x = min[0]; x <= max[0]; x++) {
    for (let y = min[1]; y <= max[1]; y++) {
      for (let z = min[2]; z <= max[2]; z++) {
        const cell: Vec3 = [x, y, z];
        maskAdd(mask, cell);
        revealAround(map, mask, cell);
      }
    }
  }
}
