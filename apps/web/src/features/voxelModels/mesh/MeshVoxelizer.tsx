import { useEffect } from 'react';
import {
  bytesToBase64,
  encodeVoxels,
  fitMeshTriangles,
  STL_DEFAULT_COLOR,
  voxelizeTriangles,
  type ModelMeshFit,
  type Vec3,
} from 'shared';
import { meshVoxelsKey, type MeshSource } from './meshSource';
import { meshTriangles } from './meshTriangles';
import { useMeshModel } from './useMeshModel';

export interface MeshVoxels {
  key: string;
  voxels: string;
  palette: string[];
}

interface MeshVoxelizerProps {
  source: MeshSource;
  fit: ModelMeshFit;
  size: Vec3;
  color: string | null;
  // По чему посчитаны воксели в форме сейчас: совпадает — ничего не делаем.
  currentKey: string | null;
  onVoxels: (result: MeshVoxels) => void;
  onError: (message: string | null) => void;
}

// Воксели для правил из загруженного файла (docs/plan/blocks.md, этап 9): читает файл и
// пересчитывает сетку, когда меняются файл, вписывание, размер или цвет. Ничего не
// рисует — живёт в ленивом модуле, чтобы three не попал в общий бандл. Цвет вокселей —
// цвет STL (у `.glb` — серый камень): их видно только на миниатюрах в списке.
function MeshVoxelizer({
  source,
  fit,
  size,
  color,
  currentKey,
  onVoxels,
  onError,
}: MeshVoxelizerProps) {
  const state = useMeshModel(source);
  const key = meshVoxelsKey(source, fit, size, color);

  useEffect(() => {
    if (state?.status === 'error') onError(state.message);
    if (state?.status !== 'ready') return;
    onError(null);
    if (key === currentKey) return;
    const triangles = fitMeshTriangles(
      meshTriangles(state.model.object),
      fit,
      size,
    );
    const voxels = voxelizeTriangles(triangles, size);
    onVoxels({
      key,
      voxels: bytesToBase64(encodeVoxels(voxels)),
      palette: [color ?? STL_DEFAULT_COLOR],
    });
    // fit, size и color входят в key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, key, currentKey]);

  return null;
}

export default MeshVoxelizer;
