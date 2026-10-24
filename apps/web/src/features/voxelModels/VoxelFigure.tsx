import { useMemo } from 'react';
import type { CharacterModelFit } from 'shared';
import { FittedFigure } from '../maps/models';
import type { VoxelFigureData } from './voxelBounds';
import type { MeshChange } from './voxelGeometry';
import VoxelMeshes from './VoxelMeshes';

interface VoxelFigureProps {
  data: VoxelFigureData;
  footprint: number;
  fit: CharacterModelFit;
  lying?: boolean;
}

// Рисованная модель монстра на месте существа (docs/plan/done/monster-models.md, этап 5): те же
// сетки по клеткам, что в редакторе, вписанные по рамке закрашенных вокселей, как файл
// модели. «Вперёд» модели — север, как взгляд фигурки с направлением 0.
function VoxelFigure({ data, footprint, fit, lying }: VoxelFigureProps) {
  const change = useMemo<MeshChange>(
    () => ({ version: 0, cells: 'all' }),
    // Новая модель — новая сборка всех клеток.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );
  return (
    <FittedFigure box={data.box} footprint={footprint} fit={fit} lying={lying}>
      <VoxelMeshes
        grid={data.grid}
        change={change}
        sliceTop={data.grid.dims[1]}
      />
    </FittedFigure>
  );
}

export default VoxelFigure;
