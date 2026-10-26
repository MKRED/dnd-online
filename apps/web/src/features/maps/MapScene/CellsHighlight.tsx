import { useLayoutEffect, useRef } from 'react';
import { Object3D, type InstancedMesh } from 'three';
import type { Vec3 } from 'shared';

const dummy = new Object3D();

// Подсветка отдельных клеток (что заменит «Замена», макет «П6», docs/plan/done/scene-page.md,
// этап 3): одна сетка на все клетки, чуть больше блока, чтобы не мерцать на его гранях.
// Луч сквозь неё проходит — выбор клеток идёт по блокам.
function CellsHighlight({ cells, color }: { cells: Vec3[]; color: string }) {
  const ref = useRef<InstancedMesh>(null);
  // Ёмкость — степень двойки: сетка пересоздаётся, только когда клеток стало вдвое больше.
  const capacity = Math.max(64, 2 ** Math.ceil(Math.log2(cells.length || 1)));
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    cells.forEach(([x, y, z], index) => {
      dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });
    mesh.count = cells.length;
    mesh.instanceMatrix.needsUpdate = true;
  }, [cells]);
  return (
    <instancedMesh
      key={capacity}
      ref={ref}
      args={[undefined, undefined, capacity]}
      raycast={() => null}
    >
      <boxGeometry args={[1.04, 1.04, 1.04]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.35}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

export default CellsHighlight;
