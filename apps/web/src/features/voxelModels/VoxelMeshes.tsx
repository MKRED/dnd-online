import { useEffect, useMemo, useRef } from 'react';
import { Group, Mesh, MeshLambertMaterial } from 'three';
import { allCells, cellGeometry, type MeshChange } from './voxelGeometry';
import type { VoxelGrid } from './voxelGrid';
import { buildCellMesh } from './voxelMesh';

interface VoxelMeshesProps {
  grid: VoxelGrid;
  change: MeshChange;
  sliceTop: number;
}

// Воксели модели — по сетке на клетку (docs/plan/blocks.md, этап 8а). Сетки живут вне
// React: правка пересобирает и подменяет в группе только тронутые клетки, без новой
// отрисовки всей сцены.
function VoxelMeshes({ grid, change, sliceTop }: VoxelMeshesProps) {
  const group = useRef<Group>(null);
  const meshes = useRef(new Map<string, Mesh>());
  const material = useMemo(
    () => new MeshLambertMaterial({ vertexColors: true }),
    [],
  );

  useEffect(() => {
    const root = group.current;
    if (!root) return;
    const byCell = meshes.current;
    const drop = (key: string) => {
      const mesh = byCell.get(key);
      if (!mesh) return;
      root.remove(mesh);
      mesh.geometry.dispose();
      byCell.delete(key);
    };
    // Пустая группа — после повторной сборки в StrictMode или в начале: собираем всё.
    const everything = change.cells === 'all' || byCell.size === 0;
    if (everything) [...byCell.keys()].forEach(drop);
    const cells =
      everything || change.cells === 'all' ? allCells(grid.size) : change.cells;
    for (const cell of cells) {
      const key = cell.join(',');
      drop(key);
      const data = buildCellMesh(grid, cell, sliceTop);
      if (!data.positions.length) continue;
      const mesh = new Mesh(cellGeometry(data), material);
      byCell.set(key, mesh);
      root.add(mesh);
    }
  }, [grid, change, sliceTop, material]);

  // Уход со сцены — освобождаем видеопамять сеток и материала. Сетки и убираем из
  // группы: в StrictMode эффекты проходят дважды, и вторая сборка начнётся с пустой.
  useEffect(() => {
    const root = group.current;
    const byCell = meshes.current;
    return () => {
      byCell.forEach((mesh) => {
        root?.remove(mesh);
        mesh.geometry.dispose();
      });
      byCell.clear();
      material.dispose();
    };
  }, [material]);

  return <group ref={group} />;
}

export default VoxelMeshes;
