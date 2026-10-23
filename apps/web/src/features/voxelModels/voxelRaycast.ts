import { MODEL_CELL_VOXELS, type Vec3 } from 'shared';
import { inGrid, voxelAt, type VoxelGrid } from './voxelGrid';

// Куда попал луч в редакторе: в воксель (и в какую его грань) или в пол модели.
export type VoxelHit =
  { kind: 'voxel'; at: Vec3; normal: Vec3 } | { kind: 'floor'; at: Vec3 };

// Луч в координатах сетки (воксель [x, y, z] занимает [x, x + 1] по каждой оси) — шагами
// по граням вокселей (Amanatides — Woo). Воксели не ниже среза (y >= sliceTop) не видны,
// и луч проходит сквозь них, как сквозь пустоту: так добираются до внутренних.
export function castVoxelRay(
  grid: VoxelGrid,
  origin: Vec3,
  dir: Vec3,
  sliceTop: number,
): VoxelHit | null {
  const visible = (at: Vec3) => at[1] < sliceTop && voxelAt(grid, at) > 0;
  const enter = enterBox(grid.dims, origin, dir);
  if (enter !== null) {
    const start = origin.map((o, i) => o + dir[i] * (enter + 1e-6));
    const cell = start.map((v, i) =>
      Math.min(grid.dims[i] - 1, Math.max(0, Math.floor(v))),
    );
    const step = dir.map((d) => Math.sign(d));
    const delta = dir.map((d) => (d === 0 ? Infinity : Math.abs(1 / d)));
    const next = dir.map((d, i) =>
      d === 0
        ? Infinity
        : (d > 0 ? cell[i] + 1 - start[i] : start[i] - cell[i]) * delta[i],
    );
    let normal: Vec3 = [0, 0, 0];
    // Первая клетка — та, в которую луч вошёл: нормаль у неё — грань входа в модель.
    const first = (axis: number): Vec3 =>
      [0, 1, 2].map((i) => (i === axis ? -step[i] : 0)) as unknown as Vec3;
    const entryAxis = entryFace(grid.dims, origin, dir, enter);
    if (entryAxis !== null) normal = first(entryAxis);
    while (inGrid(grid, cell as unknown as Vec3)) {
      const at = [...cell] as unknown as Vec3;
      if (visible(at)) return { kind: 'voxel', at, normal };
      const axis = next.indexOf(Math.min(...next));
      cell[axis] += step[axis];
      next[axis] += delta[axis];
      normal = first(axis);
    }
  }
  // Мимо вокселей — в пол модели (y = 0) в её пределах.
  if (dir[1] >= 0) return null;
  const t = -origin[1] / dir[1];
  const x = Math.floor(origin[0] + dir[0] * t);
  const z = Math.floor(origin[2] + dir[2] * t);
  return inGrid(grid, [x, 0, z]) ? { kind: 'floor', at: [x, 0, z] } : null;
}

// Где луч входит в коробку модели: t (0 — начало внутри) или null — мимо.
function enterBox(dims: Vec3, origin: Vec3, dir: Vec3): number | null {
  let near = 0;
  let far = Infinity;
  for (let i = 0; i < 3; i++) {
    if (dir[i] === 0) {
      if (origin[i] < 0 || origin[i] > dims[i]) return null;
      continue;
    }
    const a = (0 - origin[i]) / dir[i];
    const b = (dims[i] - origin[i]) / dir[i];
    near = Math.max(near, Math.min(a, b));
    far = Math.min(far, Math.max(a, b));
  }
  return near <= far ? near : null;
}

// Ось грани, через которую луч входит в коробку; начало внутри — null.
function entryFace(
  dims: Vec3,
  origin: Vec3,
  dir: Vec3,
  enter: number,
): number | null {
  if (enter === 0) return null;
  for (let i = 0; i < 3; i++) {
    if (dir[i] === 0) continue;
    const plane = dir[i] > 0 ? 0 : dims[i];
    if (Math.abs((plane - origin[i]) / dir[i] - enter) < 1e-9) return i;
  }
  return null;
}

// Воксель, который поставит клик: рядом с гранью попадания или на полу.
export function placeTarget(hit: VoxelHit): Vec3 {
  if (hit.kind === 'floor') return hit.at;
  return hit.at.map((v, i) => v + hit.normal[i]) as unknown as Vec3;
}

// Клетка модели под вокселем.
export const cellOfVoxel = (at: Vec3): Vec3 =>
  at.map((v) => Math.floor(v / MODEL_CELL_VOXELS)) as unknown as Vec3;
