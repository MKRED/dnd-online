import { useEffect, useMemo } from 'react';
import type { ModelMeshFit, Vec3 } from 'shared';
import type { LoadedModel } from '../../maps/models';
import {
  disposeMeshObjectCopy,
  meshFitPlacement,
  meshObjectCopy,
} from './meshObject';

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
// Снимок для списка собирает то же без React (meshObject.ts, fittedMeshGroup).
function MeshModel({ model, fit, size, color, voxelUnit }: MeshModelProps) {
  const object = useMemo(() => meshObjectCopy(model, color), [model, color]);
  useEffect(() => () => disposeMeshObjectCopy(model, object), [model, object]);

  const placement = useMemo(
    () => meshFitPlacement(model.box, fit, size),
    [model.box, fit, size],
  );
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
