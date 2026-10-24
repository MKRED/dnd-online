import { voxelIndex, type VoxelModelFields } from 'shared';
import type { ModelBox } from '../maps/models/modelFit';
import { gridFromFields, type VoxelGrid } from './voxelGrid';

// Рамка закрашенных вокселей модели в вокселях — по ней модель монстра вписывается в
// место существа, как файл модели по своей рамке (docs/plan/done/monster-models.md, этап 5):
// пустые клетки вокруг фигуры её не уменьшают. Пустая модель — null.
export function voxelBounds(grid: VoxelGrid): ModelBox | null {
  const [dx, dy, dz] = grid.dims;
  const min: [number, number, number] = [dx, dy, dz];
  const max: [number, number, number] = [0, 0, 0];
  let found = false;
  for (let y = 0; y < dy; y++)
    for (let z = 0; z < dz; z++)
      for (let x = 0; x < dx; x++) {
        if (!grid.voxels[voxelIndex(grid.dims, x, y, z)]) continue;
        found = true;
        if (x < min[0]) min[0] = x;
        if (y < min[1]) min[1] = y;
        if (z < min[2]) min[2] = z;
        if (x + 1 > max[0]) max[0] = x + 1;
        if (y + 1 > max[1]) max[1] = y + 1;
        if (z + 1 > max[2]) max[2] = z + 1;
      }
  return found ? { min, max } : null;
}

export interface VoxelFigureData {
  grid: VoxelGrid;
  box: ModelBox;
}

// Распаковка и рамка — раз на модель: фигурку на сцене перерисовывают часто.
const cache = new WeakMap<VoxelModelFields, VoxelFigureData | null>();

export function voxelFigureData(
  fields: VoxelModelFields,
): VoxelFigureData | null {
  if (cache.has(fields)) return cache.get(fields) ?? null;
  const grid = gridFromFields(fields);
  const box = voxelBounds(grid);
  const data = box ? { grid, box } : null;
  cache.set(fields, data);
  return data;
}
