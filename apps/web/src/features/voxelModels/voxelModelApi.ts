import type { VoxelModel, VoxelModelInput, VoxelModelUsage } from 'shared';
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
