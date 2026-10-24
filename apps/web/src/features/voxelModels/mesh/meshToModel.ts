import {
  bytesToBase64,
  defaultMeshFit,
  detectModelFormat,
  encodeVoxels,
  fitMeshTriangles,
  STL_DEFAULT_COLOR,
  voxelizeTriangles,
  type ModelMeshFormat,
  type VoxelModelFields,
} from 'shared';
import { parseModelData } from '../../maps/models/loadModel';
import { meshCellSize } from './meshCellSize';
import { meshTriangles } from './meshTriangles';

export interface MeshModel {
  format: ModelMeshFormat;
  fields: VoxelModelFields;
}

// Новая модель справочника из файла, выбранного в форме монстра
// (docs/plan/done/monster-models.md, этап 4): размер в клетках — по месту существа, воксели для
// правил — как в форме «Моделей» (MeshVoxelizer), с вписыванием и цветом по умолчанию —
// такими же их ставит сервер при загрузке файла. Модуль на three — грузится лениво.
export async function meshToModel(
  file: File,
  footprint: number,
): Promise<MeshModel> {
  const data = await file.arrayBuffer();
  const format = detectModelFormat(new Uint8Array(data));
  if (!format)
    throw new Error('Не удалось распознать модель. Подойдут .glb и STL');
  const loaded = await parseModelData(data, format);
  const fit = defaultMeshFit(format);
  const positions = meshTriangles(loaded.object);
  const size = meshCellSize(positions, fit, footprint);
  const voxels = voxelizeTriangles(
    fitMeshTriangles(positions, fit, size),
    size,
  );
  return {
    format,
    fields: {
      size,
      palette: [STL_DEFAULT_COLOR],
      voxels: bytesToBase64(encodeVoxels(voxels)),
      cells: {},
    },
  };
}
