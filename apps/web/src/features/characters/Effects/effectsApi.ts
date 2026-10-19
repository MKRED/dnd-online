import type { Effect, EffectLink } from 'shared';
import { apiRequest } from '../../../lib/apiRequest';
import { catalogApi } from '../../catalog';

// Каталог эффектов — свой экземпляр запросов, а не EFFECTS из simpleCatalog: тот через
// characters импортирует лист, и импорт отсюда замкнул бы круг модулей.
export const effectsCatalog = catalogApi<Effect, never>('/effects');

// Эффект на существе — персонаже или монстре.
export type EffectLinkEntry = { id: string } & EffectLink;

// Правки эффектов по адресу владельца: `/characters/:id/effects` или
// `/monsters/:id/effects`. Каждая отдаёт эффекты целиком (docs/server.md).
export function effectLinksApi(base: string) {
  return {
    apply: (effectId: string): Promise<EffectLinkEntry[]> =>
      apiRequest(base, { method: 'POST', body: JSON.stringify({ effectId }) }),
    remove: (entryId: string): Promise<EffectLinkEntry[]> =>
      apiRequest(`${base}/${entryId}`, { method: 'DELETE' }),
  };
}
