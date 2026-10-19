import type {
  MonsterItemAddInput,
  MonsterItemEntry,
  MonsterItemUpdateInput,
} from 'shared';
import { apiRequest } from '../../../lib/apiRequest';

// Снаряжение монстра (docs/server.md, «Gear on a monster»). Каждая правка отдаёт список
// целиком.
export function monsterItemsApi(monsterId: string) {
  const base = `/monsters/${monsterId}/items`;
  return {
    add: (input: MonsterItemAddInput): Promise<MonsterItemEntry[]> =>
      apiRequest(base, { method: 'POST', body: JSON.stringify(input) }),
    update: (
      entryId: string,
      input: MonsterItemUpdateInput,
    ): Promise<MonsterItemEntry[]> =>
      apiRequest(`${base}/${entryId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    remove: (entryId: string): Promise<MonsterItemEntry[]> =>
      apiRequest(`${base}/${entryId}`, { method: 'DELETE' }),
  };
}
