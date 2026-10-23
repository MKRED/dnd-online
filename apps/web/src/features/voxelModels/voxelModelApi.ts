import type { VoxelModel } from 'shared';
import { apiRequest } from '../../lib/apiRequest';

// Копия чужой модели себе и «Подтянуть обновления» — как у групп блоков (этап 6б).
export const copyVoxelModel = (id: string): Promise<VoxelModel> =>
  apiRequest(`/voxel-models/${id}/copy`, { method: 'POST' });

export const pullVoxelModel = (id: string): Promise<VoxelModel> =>
  apiRequest(`/voxel-models/${id}/pull`, { method: 'POST' });
