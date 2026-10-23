import { useMemo } from 'react';
import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  EdgesGeometry,
  Shape,
} from 'three';
import { MODEL_CELL_VOXELS, type Vec3 } from 'shared';

interface VoxelGuidesProps {
  dims: Vec3;
  // Тонкая сетка по вокселям — только в редакторе; предпросмотру хватает клеток.
  voxelLines?: boolean;
}

// Отрезки сетки пола в плоскости y = 0: через каждые step вокселей по обеим осям.
function floorLines([dx, , dz]: Vec3, step: number): BufferGeometry {
  const points: number[] = [];
  for (let x = 0; x <= dx; x += step) points.push(x, 0, 0, x, 0, dz);
  for (let z = 0; z <= dz; z += step) points.push(0, 0, z, dx, 0, z);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(Float32Array.from(points), 3),
  );
  return geometry;
}

// Стрелка «вперёд» на полу у северного края: модель смотрит на север (−z), как взгляд
// фигурки с направлением 0 (docs/plan/blocks.md, этап 8а).
function arrowShape(width: number): Shape {
  const w = width;
  const shape = new Shape();
  shape.moveTo(-w * 0.15, 0);
  shape.lineTo(w * 0.15, 0);
  shape.lineTo(w * 0.15, w * 0.35);
  shape.lineTo(w * 0.35, w * 0.35);
  shape.lineTo(0, w * 0.75);
  shape.lineTo(-w * 0.35, w * 0.35);
  shape.lineTo(-w * 0.15, w * 0.35);
  shape.closePath();
  return shape;
}

// Пол модели с разметкой клеток (16 вокселей — клетка карты), рамка всего объёма и
// стрелка «вперёд». Координаты — сетки вокселей, сдвиг даёт родительская группа.
function VoxelGuides({ dims, voxelLines = false }: VoxelGuidesProps) {
  const cells = useMemo(() => floorLines(dims, MODEL_CELL_VOXELS), [dims]);
  const voxels = useMemo(() => floorLines(dims, 1), [dims]);
  const arrow = useMemo(() => arrowShape(MODEL_CELL_VOXELS / 2), []);
  const [dx, dy, dz] = dims;
  const bounds = useMemo(
    () => new EdgesGeometry(new BoxGeometry(dx, dy, dz)),
    [dx, dy, dz],
  );
  return (
    <group>
      <mesh position={[dx / 2, -0.02, dz / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[dx, dz]} />
        <meshBasicMaterial color="#6b6157" transparent opacity={0.35} />
      </mesh>
      {voxelLines && (
        <lineSegments geometry={voxels}>
          <lineBasicMaterial color="#ffffff" transparent opacity={0.08} />
        </lineSegments>
      )}
      <lineSegments geometry={cells} position={[0, 0.01, 0]}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.45} />
      </lineSegments>
      <lineSegments geometry={bounds} position={[dx / 2, dy / 2, dz / 2]}>
        <lineBasicMaterial color="#ffffff" transparent opacity={0.25} />
      </lineSegments>
      {/* Плоскость фигуры — XY с остриём к +y; поворот кладёт её на пол остриём к −z. */}
      <mesh position={[dx / 2, 0, -2]} rotation={[-Math.PI / 2, 0, 0]}>
        <shapeGeometry args={[arrow]} />
        <meshBasicMaterial color="#f59f00" />
      </mesh>
    </group>
  );
}

export default VoxelGuides;
