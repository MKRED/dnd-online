import { useEffect, useMemo } from 'react';
import { Mesh, MeshStandardMaterial } from 'three';
import { clone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  meshPlacement,
  orientMeshPoint,
  STL_DEFAULT_COLOR,
  type ModelMeshFit,
  type Vec3,
} from 'shared';
import type { LoadedModel } from '../../maps/models';

interface MeshModelProps {
  model: LoadedModel;
  fit: ModelMeshFit;
  // Размер модели в клетках.
  size: Vec3;
  // Цвет STL; у `.glb` свои цвета.
  color: string | null;
  // Сколько единиц сцены в вокселе: в предпросмотре — 1, на карте — 1/16 клетки.
  voxelUnit: number;
}

// Загруженный файл модели, вписанный в её клетки так же, как воксели для правил
// (docs/plan/blocks.md, этап 9; fitMeshTriangles в shared): ось верха, поворот лицом на
// север, равномерный масштаб, стоит на дне, по середине. Начало — угол клеток модели.
function MeshModel({ model, fit, size, color, voxelUnit }: MeshModelProps) {
  // Своя копия на каждое место: один объект three не может стоять в двух.
  const object = useMemo(() => {
    const copy = clone(model.object);
    if (model.format === 'stl') {
      const material = new MeshStandardMaterial({
        color: color ?? STL_DEFAULT_COLOR,
        roughness: 0.8,
      });
      copy.traverse((node) => {
        if (node instanceof Mesh) node.material = material;
      });
    }
    return copy;
  }, [model, color]);

  // Материал STL создан здесь — и освобождается здесь; геометрия общая с кэшем.
  useEffect(
    () => () => {
      if (model.format !== 'stl') return;
      object.traverse((node) => {
        if (node instanceof Mesh)
          (node.material as MeshStandardMaterial).dispose();
      });
    },
    [object, model.format],
  );

  const placement = useMemo(() => {
    const { min, max } = model.box;
    const lo = [Infinity, Infinity, Infinity];
    const hi = [-Infinity, -Infinity, -Infinity];
    // Повороты кратны четверти оборота: коробка углов после поворота — коробка модели.
    for (const x of [min[0], max[0]])
      for (const y of [min[1], max[1]])
        for (const z of [min[2], max[2]]) {
          const p = orientMeshPoint(x, y, z, fit);
          for (let a = 0; a < 3; a++) {
            lo[a] = Math.min(lo[a], p[a]);
            hi[a] = Math.max(hi[a], p[a]);
          }
        }
    return meshPlacement(lo, hi, size);
  }, [model.box, fit, size]);
  if (!placement) return null;

  const { scale, shift } = placement;
  return (
    <group
      position={[
        shift[0] * voxelUnit,
        shift[1] * voxelUnit,
        shift[2] * voxelUnit,
      ]}
      scale={scale * voxelUnit}
    >
      <group rotation={[0, (-fit.turn * Math.PI) / 2, 0]}>
        <group rotation={[fit.up === 'z' ? -Math.PI / 2 : 0, 0, 0]}>
          <primitive object={object} />
        </group>
      </group>
    </group>
  );
}

export default MeshModel;
