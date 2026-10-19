import type { Ability } from 'shared';
import { apiRequest } from '../../lib/apiRequest';
import { catalogApi } from '../catalog';

// Каталог способностей — свой экземпляр запросов, а не из simpleCatalog: тот через
// characters импортирует лист, и импорт отсюда замкнул бы круг модулей (как у эффектов).
export const abilitiesCatalog = catalogApi<Ability, never>('/abilities');

// Правки способностей существа по адресу владельца: `/characters/:id/abilities` или
// `/monsters/:id/abilities`. Каждая правка отдаёт строки целиком (docs/server.md).
export function abilityLinksApi<E, Add, Update>(base: string) {
  return {
    add: (input: Add): Promise<E[]> =>
      apiRequest(base, { method: 'POST', body: JSON.stringify(input) }),
    update: (entryId: string, input: Update): Promise<E[]> =>
      apiRequest(`${base}/${entryId}`, {
        method: 'PATCH',
        body: JSON.stringify(input),
      }),
    remove: (entryId: string): Promise<E[]> =>
      apiRequest(`${base}/${entryId}`, { method: 'DELETE' }),
  };
}
