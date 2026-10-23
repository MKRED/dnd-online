import type { BlockGroup } from 'shared';
import { apiRequest } from '../../../lib/apiRequest';

// Копия чужой группы себе и «Подтянуть обновления» (docs/plan/blocks.md, этап 6б).
export const copyBlockGroup = (id: string): Promise<BlockGroup> =>
  apiRequest(`/block-groups/${id}/copy`, { method: 'POST' });

export const pullBlockGroup = (id: string): Promise<BlockGroup> =>
  apiRequest(`/block-groups/${id}/pull`, { method: 'POST' });
