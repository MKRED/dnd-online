import { voxelIndex, type Vec3 } from 'shared';
import { inGrid, type VoxelGrid } from './voxelGrid';

// Размеры кисти в вокселях: 16 — целая клетка, как блок карты.
export const BRUSH_SIZES = [1, 2, 4, 8, 16] as const;
export type BrushSize = (typeof BRUSH_SIZES)[number];

// Зеркало по осям: правка повторяется отражённой относительно середины модели.
export interface Mirror {
  x: boolean;
  z: boolean;
}

// Угол кубика кисти: кисть больше вокселя прилипает к своей сетке (кубики по 2, 4…
// вокселя), и стены из них сходятся без зазоров, как блоки.
export const brushCorner = (at: Vec3, brush: BrushSize): Vec3 =>
  at.map((v) => Math.floor(v / brush) * brush) as unknown as Vec3;

// Индексы вокселей под кистью с зеркалом — без повторов и только внутри модели.
export function brushIndices(
  grid: VoxelGrid,
  at: Vec3,
  brush: BrushSize,
  mirror: Mirror,
): number[] {
  const [cx, cy, cz] = brushCorner(at, brush);
  const [dx, , dz] = grid.dims;
  const result = new Set<number>();
  for (let y = cy; y < cy + brush; y++)
    for (let z = cz; z < cz + brush; z++)
      for (let x = cx; x < cx + brush; x++) {
        const xs = mirror.x ? [x, dx - 1 - x] : [x];
        const zs = mirror.z ? [z, dz - 1 - z] : [z];
        for (const mx of xs)
          for (const mz of zs)
            if (inGrid(grid, [mx, y, mz]))
              result.add(voxelIndex(grid.dims, mx, y, mz));
      }
  return [...result];
}
