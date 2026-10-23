import { MODEL_CELL_VOXELS, voxelIndex, type Vec3 } from 'shared';
import type { VoxelGrid } from './voxelGrid';

// Сетка для отрисовки одной клетки модели (16³ вокселей): грани, у которых сосед пуст
// или срезан, с цветом из палитры в вершинах. Своя, а не сетка чанка карты: у карты
// атлас текстур, а воксели — просто цвета (docs/plan/blocks.md, этап 8а). Клетка — кусок
// перерисовки: мазок пересобирает только свои клетки и соседние.
export interface VoxelMeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
}

// Грань: нормаль и четыре угла единичного куба против часовой, если смотреть снаружи.
const FACES: { normal: Vec3; corners: Vec3[] }[] = [
  {
    normal: [1, 0, 0],
    corners: [
      [1, 0, 1],
      [1, 0, 0],
      [1, 1, 0],
      [1, 1, 1],
    ],
  },
  {
    normal: [-1, 0, 0],
    corners: [
      [0, 0, 0],
      [0, 0, 1],
      [0, 1, 1],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, 1, 0],
    corners: [
      [0, 1, 1],
      [1, 1, 1],
      [1, 1, 0],
      [0, 1, 0],
    ],
  },
  {
    normal: [0, -1, 0],
    corners: [
      [0, 0, 0],
      [1, 0, 0],
      [1, 0, 1],
      [0, 0, 1],
    ],
  },
  {
    normal: [0, 0, 1],
    corners: [
      [0, 0, 1],
      [1, 0, 1],
      [1, 1, 1],
      [0, 1, 1],
    ],
  },
  {
    normal: [0, 0, -1],
    corners: [
      [1, 0, 0],
      [0, 0, 0],
      [0, 1, 0],
      [1, 1, 0],
    ],
  },
];
const TRIANGLE = [0, 1, 2, 0, 2, 3];

const linear = (channel: number) => {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

// Цвета палитры — в линейном пространстве: three пишет цвет вершин без перевода из sRGB.
function paletteColors(palette: string[]): Float32Array {
  const colors = new Float32Array((palette.length + 1) * 3);
  palette.forEach((hex, i) => {
    const n = parseInt(hex.slice(1), 16);
    colors[(i + 1) * 3] = linear((n >> 16) & 255);
    colors[(i + 1) * 3 + 1] = linear((n >> 8) & 255);
    colors[(i + 1) * 3 + 2] = linear(n & 255);
  });
  return colors;
}

export function buildCellMesh(
  grid: VoxelGrid,
  cell: Vec3,
  sliceTop: number,
): VoxelMeshData {
  const n = MODEL_CELL_VOXELS;
  const [dx, dy, dz] = grid.dims;
  const top = Math.min(dy, sliceTop);
  const colors = paletteColors(grid.palette);
  const filled = (x: number, y: number, z: number) =>
    x >= 0 &&
    z >= 0 &&
    y >= 0 &&
    x < dx &&
    z < dz &&
    y < top &&
    grid.voxels[voxelIndex(grid.dims, x, y, z)] > 0;
  const pos: number[] = [];
  const nor: number[] = [];
  const col: number[] = [];
  const [cx, cy, cz] = cell.map((c) => c * n);
  for (let y = cy; y < Math.min(cy + n, top); y++)
    for (let z = cz; z < cz + n; z++)
      for (let x = cx; x < cx + n; x++) {
        const value = grid.voxels[voxelIndex(grid.dims, x, y, z)];
        if (!value) continue;
        for (const { normal, corners } of FACES) {
          if (filled(x + normal[0], y + normal[1], z + normal[2])) continue;
          for (const corner of TRIANGLE) {
            const [ox, oy, oz] = corners[corner];
            pos.push(x + ox, y + oy, z + oz);
            nor.push(...normal);
            col.push(
              colors[value * 3],
              colors[value * 3 + 1],
              colors[value * 3 + 2],
            );
          }
        }
      }
  return {
    positions: Float32Array.from(pos),
    normals: Float32Array.from(nor),
    colors: Float32Array.from(col),
  };
}

// Клетки, которые надо пересобрать после правки этих вокселей: свои и соседние через
// грань (грань вокселя на краю клетки зависит от соседа).
export function touchedCells(grid: VoxelGrid, indices: number[]): Vec3[] {
  const [dx, , dz] = grid.dims;
  const [sx, sy, sz] = grid.size;
  const keys = new Set<string>();
  const n = MODEL_CELL_VOXELS;
  for (const index of indices) {
    const x = index % dx;
    const z = Math.floor(index / dx) % dz;
    const y = Math.floor(index / (dx * dz));
    for (const [ox, oy, oz] of [
      [0, 0, 0],
      [1, 0, 0],
      [-1, 0, 0],
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
    ]) {
      const c = [
        Math.floor((x + ox) / n),
        Math.floor((y + oy) / n),
        Math.floor((z + oz) / n),
      ];
      if (
        c[0] >= 0 &&
        c[1] >= 0 &&
        c[2] >= 0 &&
        c[0] < sx &&
        c[1] < sy &&
        c[2] < sz
      )
        keys.add(c.join(','));
    }
  }
  return [...keys].map((key) => key.split(',').map(Number) as unknown as Vec3);
}
