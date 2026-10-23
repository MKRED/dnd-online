import type {
  ModelMesh,
  ModelMeshFit,
  VoxelModel,
  VoxelModelInput,
  VoxelModelUsage,
} from 'shared';
import { apiRequest } from '../../lib/apiRequest';
import { catalogApi } from '../catalog';

// Запросы справочника «Модели»: общие каталожные — для формы обстановки, которая
// выбирает, рисует и правит модель, не уходя со своей страницы (этап 8б).
export const voxelModelsApi = catalogApi<VoxelModel, VoxelModelInput>(
  '/voxel-models',
);

// Копия чужой модели себе и «Подтянуть обновления» — как у групп блоков (этап 6б).
export const copyVoxelModel = (id: string): Promise<VoxelModel> =>
  apiRequest(`/voxel-models/${id}/copy`, { method: 'POST' });

export const pullVoxelModel = (id: string): Promise<VoxelModel> =>
  apiRequest(`/voxel-models/${id}/pull`, { method: 'POST' });

// Обстановка с этой моделью — для вопроса перед удалением модели.
export const voxelModelUsage = (id: string): Promise<VoxelModelUsage> =>
  apiRequest(`/voxel-models/${id}/usage`);

// Загруженный файл модели (этап 9): загрузка заменяет прежний, цвет STL и вписывание —
// отдельной правкой, удаление оставляет воксели.
export function uploadModelMesh(id: string, file: File): Promise<ModelMesh> {
  const body = new FormData();
  body.append('file', file);
  return apiRequest(`/voxel-models/${id}/mesh`, { method: 'PUT', body });
}

export const patchModelMesh = (
  id: string,
  patch: { color?: string; fit?: ModelMeshFit },
): Promise<ModelMesh> =>
  apiRequest(`/voxel-models/${id}/mesh`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });

export const removeModelMesh = (id: string): Promise<void> =>
  apiRequest(`/voxel-models/${id}/mesh`, { method: 'DELETE' });
