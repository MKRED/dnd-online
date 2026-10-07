import { useThree } from '@react-three/fiber';
import { useLayoutEffect, useRef } from 'react';
import { Color, InstancedMesh, Object3D } from 'three';
import type { ReachTile } from '../walkTest';

// Плитка чуть меньше клетки (видна сетка между соседями) и чуть выше пола (не
// мерцает, совпадая с гранью блока).
const TILE = 0.86;
const LIFT = 0.03;
// Цвет по цене хода: у фигурки — зелёный, на пределе оставшихся футов — жёлтый.
const NEAR = new Color('#37b24d');
const FAR = new Color('#ffd43b');

interface ReachTilesProps {
  tiles: ReachTile[];
  budget: number;
}

// Подсветка «куда могу дойти»: все плитки одним InstancedMesh — позиций бывают
// сотни, и по мешу на каждую было бы слишком дорого.
function ReachTiles({ tiles, budget }: ReachTilesProps) {
  const ref = useRef<InstancedMesh>(null);
  const invalidate = useThree((state) => state.invalidate);

  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    const color = new Color();
    tiles.forEach(({ at, cost }, i) => {
      dummy.position.set(at[0] + 0.5, at[1] + LIFT, at[2] + 0.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(
        i,
        color.lerpColors(NEAR, FAR, budget ? cost / budget : 0),
      );
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    // Границы для отсечения камерой считаются по первому кадру и иначе устареют.
    mesh.computeBoundingSphere();
    // Сцена рисует кадр по требованию, а правка буферов — не смена пропсов R3F.
    invalidate();
  }, [tiles, budget, invalidate]);

  // key по числу плиток: размер InstancedMesh задаётся при создании.
  return (
    <instancedMesh
      key={tiles.length}
      ref={ref}
      args={[undefined, undefined, tiles.length]}
      raycast={() => null}
    >
      <boxGeometry args={[TILE, 0.02, TILE]} />
      <meshBasicMaterial transparent opacity={0.75} depthWrite={false} />
    </instancedMesh>
  );
}

export default ReachTiles;
