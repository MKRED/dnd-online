import type {
  CharacterEffectAddInput,
  CharacterEffectEntry,
  Effect,
} from 'shared';
import { apiRequest } from '../../../lib/apiRequest';
import { catalogApi } from '../../catalog';

// Каталог эффектов — свой экземпляр запросов, а не EFFECTS из simpleCatalog: тот через
// characters импортирует лист, и импорт отсюда замкнул бы круг модулей.
export const effectsCatalog = catalogApi<Effect, never>('/effects');

// Каждая правка отдаёт эффекты персонажа целиком (docs/server.md, «Effects on a
// character»).
const base = (characterId: string) => `/characters/${characterId}/effects`;

export function applyEffect(
  characterId: string,
  input: CharacterEffectAddInput,
): Promise<CharacterEffectEntry[]> {
  return apiRequest(base(characterId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeEffect(
  characterId: string,
  entryId: string,
): Promise<CharacterEffectEntry[]> {
  return apiRequest(`${base(characterId)}/${entryId}`, { method: 'DELETE' });
}
