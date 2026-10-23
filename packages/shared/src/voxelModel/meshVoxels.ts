import type { Vec3 } from '../map/coords.js';
import type { ModelMeshFit } from './modelMesh.js';
import { modelVoxelSize, voxelIndex } from './voxelModel.js';

// Воксели загруженной модели для правил (docs/plan/blocks.md, этап 9): файл вписывается
// в клетки модели и переводится в сетку 16 вокселей на клетку. Разбор `.glb` и STL — в
// вебе (three), сюда приходят только треугольники: по 9 чисел на треугольник.

type Turn = ModelMeshFit['turn'];

// Ось «вверх» файла — в Y модели, потом поворот вокруг вертикали по часовой (вид сверху):
// север (−z) уходит на восток (+x), как у клеток воксельной модели.
export function orientMeshPoint(
  x: number,
  y: number,
  z: number,
  fit: ModelMeshFit,
): Vec3 {
  const [ux, uy, uz] = fit.up === 'z' ? [x, z, -y] : [x, y, z];
  let px = ux;
  let pz = uz;
  for (let i = 0; i < (fit.turn as Turn); i++) [px, pz] = [-pz, px];
  return [px, uy, pz];
}

// Как вписать коробку файла (уже повёрнутую) в клетки модели: равномерный масштаб во весь
// размер и сдвиг — стоит на дне, по середине по x и z. В вокселях модели.
export function meshPlacement(
  min: readonly number[],
  max: readonly number[],
  size: Vec3,
): { scale: number; shift: Vec3 } | null {
  const dims = modelVoxelSize(size);
  const extent = [0, 1, 2].map((a) => max[a] - min[a]);
  const scale = Math.min(
    ...[0, 1, 2].map((a) => (extent[a] > 0 ? dims[a] / extent[a] : Infinity)),
  );
  if (!Number.isFinite(scale)) return null;
  const shift: Vec3 = [
    (dims[0] - extent[0] * scale) / 2 - min[0] * scale,
    -min[1] * scale,
    (dims[2] - extent[2] * scale) / 2 - min[2] * scale,
  ];
  return { scale, shift };
}

// Треугольники в координатах вокселей: модель повёрнута, равномерно уменьшена или
// увеличена так, чтобы влезть в клетки целиком, стоит на дне и по середине по x и z.
export function fitMeshTriangles(
  positions: Float32Array,
  fit: ModelMeshFit,
  size: Vec3,
): Float32Array {
  const out = new Float32Array(positions.length);
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    const p = orientMeshPoint(
      positions[i],
      positions[i + 1],
      positions[i + 2],
      fit,
    );
    for (let a = 0; a < 3; a++) {
      out[i + a] = p[a];
      min[a] = Math.min(min[a], p[a]);
      max[a] = Math.max(max[a], p[a]);
    }
  }
  const placement = meshPlacement(min, max, size);
  if (!placement) return new Float32Array();
  const { scale, shift } = placement;
  for (let i = 0; i < out.length; i += 3)
    for (let a = 0; a < 3; a++) out[i + a] = out[i + a] * scale + shift[a];
  return out;
}

// Сдвиг точки луча мимо рёбер: луч ровно по общему ребру двух треугольников посчитал бы
// пересечение дважды и сломал чётность.
const NUDGE = [1.37e-4, 2.71e-4] as const;

// Пересечения лучей вдоль оси axis (0 — x, 1 — y, 2 — z) через середины столбцов сетки
// с треугольниками: для каждого столбца — координаты по оси, где луч входит в поверхность.
function crossings(
  tri: Float32Array,
  dims: Vec3,
  axis: 0 | 1 | 2,
): Map<number, number[]> {
  const [u, v] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
  const result = new Map<number, number[]>();
  for (let t = 0; t < tri.length; t += 9) {
    const au = tri[t + u];
    const av = tri[t + v];
    const bu = tri[t + 3 + u];
    const bv = tri[t + 3 + v];
    const cu = tri[t + 6 + u];
    const cv = tri[t + 6 + v];
    const det = (bv - cv) * (au - cu) + (cu - bu) * (av - cv);
    if (Math.abs(det) < 1e-12) continue;
    const u0 = Math.max(0, Math.floor(Math.min(au, bu, cu)));
    const u1 = Math.min(dims[u] - 1, Math.floor(Math.max(au, bu, cu)));
    const v0 = Math.max(0, Math.floor(Math.min(av, bv, cv)));
    const v1 = Math.min(dims[v] - 1, Math.floor(Math.max(av, bv, cv)));
    for (let iu = u0; iu <= u1; iu++)
      for (let iv = v0; iv <= v1; iv++) {
        const pu = iu + 0.5 + NUDGE[0];
        const pv = iv + 0.5 + NUDGE[1];
        const l1 = ((bv - cv) * (pu - cu) + (cu - bu) * (pv - cv)) / det;
        const l2 = ((cv - av) * (pu - cu) + (au - cu) * (pv - cv)) / det;
        const l3 = 1 - l1 - l2;
        if (l1 < 0 || l2 < 0 || l3 < 0) continue;
        const along =
          l1 * tri[t + axis] + l2 * tri[t + 3 + axis] + l3 * tri[t + 6 + axis];
        const key = iu * dims[v] + iv;
        const list = result.get(key);
        if (list) list.push(along);
        else result.set(key, [along]);
      }
  }
  return result;
}

// Сетка вокселей модели (1 — занято, порядок voxelIndex). Внутренность — по чётности
// пересечений луча снизу вверх; оболочка — клетки, где лучи по всем трём осям встречают
// поверхность: так и незамкнутый файл для печати (без дна, с дырой) даёт хотя бы стенки.
export function voxelizeTriangles(tri: Float32Array, size: Vec3): Uint8Array {
  const dims = modelVoxelSize(size);
  const voxels = new Uint8Array(dims[0] * dims[1] * dims[2]);
  const set = (x: number, y: number, z: number) => {
    if (x < 0 || y < 0 || z < 0) return;
    if (x >= dims[0] || y >= dims[1] || z >= dims[2]) return;
    voxels[voxelIndex(dims, x, y, z)] = 1;
  };
  // Середина модели по осям: поверхность ровно на границе вокселей относим к вокселю со
  // стороны середины — иначе грань на дальней стороне куба утолщала бы его на слой.
  const center = [0, 1, 2].map((a) => {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = a; i < tri.length; i += 3) {
      lo = Math.min(lo, tri[i]);
      hi = Math.max(hi, tri[i]);
    }
    return (lo + hi) / 2;
  });
  for (const axis of [0, 1, 2] as const) {
    const [u, v] = axis === 0 ? [1, 2] : axis === 1 ? [0, 2] : [0, 1];
    for (const [key, list] of crossings(tri, dims, axis)) {
      const iu = Math.floor(key / dims[v]);
      const iv = key % dims[v];
      const cell = (along: number): [number, number, number] => {
        const inward = along + (along < center[axis] ? 1e-6 : -1e-6);
        const at: [number, number, number] = [0, 0, 0];
        at[axis] = Math.min(dims[axis] - 1, Math.floor(inward));
        at[u] = iu;
        at[v] = iv;
        return at;
      };
      for (const along of list) set(...cell(along));
      if (axis !== 1) continue;
      // Внутри — между парами пересечений: середина вокселя между входом и выходом.
      list.sort((a, b) => a - b);
      for (let i = 0; i + 1 < list.length; i += 2) {
        const from = Math.max(0, Math.ceil(list[i] - 0.5));
        const to = Math.min(dims[1] - 1, Math.floor(list[i + 1] - 0.5));
        for (let y = from; y <= to; y++) set(iu, y, iv);
      }
    }
  }
  return voxels;
}
