import { BufferAttribute, BufferGeometry } from 'three';
import type { Vec3 } from 'shared';
import type { VoxelMeshData } from './voxelMesh';

// Что перерисовать: клетки после мазка или всё (новая сетка, срез).
export type MeshChange = { version: number; cells: Vec3[] | 'all' };

export function cellGeometry(data: VoxelMeshData): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(data.normals, 3));
  geometry.setAttribute('color', new BufferAttribute(data.colors, 3));
  return geometry;
}

export function allCells([sx, sy, sz]: Vec3): Vec3[] {
  const cells: Vec3[] = [];
  for (let y = 0; y < sy; y++)
    for (let z = 0; z < sz; z++)
      for (let x = 0; x < sx; x++) cells.push([x, y, z]);
  return cells;
}
