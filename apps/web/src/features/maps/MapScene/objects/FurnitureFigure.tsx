import { useMemo } from 'react';
import { MODEL_CELL_VOXELS } from 'shared';
import type { MeshChange } from '../../../voxelModels/voxelGeometry';
import { gridFromFields } from '../../../voxelModels/voxelGrid';
import VoxelMeshes from '../../../voxelModels/VoxelMeshes';
import FrameBox from '../FrameBox';
import {
  facingAngle,
  type SceneObject,
  type SceneObjectLook,
} from './objectLayout';

type FurnitureLook = Extract<SceneObjectLook, { kind: 'furniture' }>;

// Обстановка на карте (docs/plan/blocks.md, этап 8в): модель из справочника «Модели» —
// те же сетки по клеткам модели, что в редакторе, в масштабе 16 вокселей на клетку.
// Модель стоит серединой основания в середине своего места и поворачивается вокруг
// неё: на 90° её ширина и глубина меняются местами, как место в правилах (objectBox).
// Без модели (удалили её или саму обстановку) — серая рамка места.
function FurnitureFigure({
  object,
  look,
}: {
  object: SceneObject;
  look: FurnitureLook;
}) {
  const grid = useMemo(
    () => (look.model ? gridFromFields(look.model) : null),
    [look.model],
  );
  const change = useMemo<MeshChange>(
    () => ({ version: 0, cells: 'all' }),
    // Новая модель — новая сборка всех клеток.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grid],
  );
  const [x, y, z] = object.base;
  if (!grid) {
    const [ex, ey, ez] = look.extent;
    return (
      <FrameBox
        min={[x - ex / 2, y, z - ez / 2]}
        max={[x + ex / 2, y + ey, z + ez / 2]}
        color="#868e96"
        opacity={0.15}
      />
    );
  }
  const [sx, , sz] = grid.size;
  return (
    <group position={object.base} rotation={[0, facingAngle(look.facing), 0]}>
      <group position={[-sx / 2, 0, -sz / 2]} scale={1 / MODEL_CELL_VOXELS}>
        <VoxelMeshes grid={grid} change={change} sliceTop={grid.dims[1]} />
      </group>
    </group>
  );
}

export default FurnitureFigure;
