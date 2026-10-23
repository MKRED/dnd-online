import { useMemo } from 'react';
import { MODEL_CELL_VOXELS } from 'shared';
import type { MeshChange } from '../../../voxelModels/voxelGeometry';
import { gridFromFields } from '../../../voxelModels/voxelGrid';
import MeshModel from '../../../voxelModels/mesh/MeshModel';
import VoxelMeshes from '../../../voxelModels/VoxelMeshes';
import { useModel } from '../../models';
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
// Без модели (удалили её или саму обстановку) — серая рамка места. Модель с загруженным
// файлом (этап 9) рисуется файлом.
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
  // Файл грузится по своему адресу; пока грузится или не прочитался — воксели.
  const mesh = useModel(look.mesh?.path ?? null, look.mesh?.format ?? null);
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
      {mesh?.status === 'ready' && look.mesh && look.model ? (
        // Загруженный файл (этап 9) — вписанный в клетки так же, как его воксели.
        <group position={[-sx / 2, 0, -sz / 2]}>
          <MeshModel
            model={mesh.model}
            fit={look.mesh.fit}
            size={look.model.size}
            color={look.mesh.color}
            voxelUnit={1 / MODEL_CELL_VOXELS}
          />
        </group>
      ) : (
        <group position={[-sx / 2, 0, -sz / 2]} scale={1 / MODEL_CELL_VOXELS}>
          <VoxelMeshes grid={grid} change={change} sliceTop={grid.dims[1]} />
        </group>
      )}
    </group>
  );
}

export default FurnitureFigure;
