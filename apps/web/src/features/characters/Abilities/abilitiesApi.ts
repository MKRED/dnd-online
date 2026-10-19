import type {
  Ability,
  CharacterAbilityAddInput,
  CharacterAbilityEntry,
  CharacterAbilityUpdateInput,
} from 'shared';
import { apiRequest } from '../../../lib/apiRequest';
import { catalogApi } from '../../catalog';

// Каталог способностей — свой экземпляр запросов, а не из simpleCatalog: тот через
// characters импортирует лист, и импорт отсюда замкнул бы круг модулей (как у эффектов).
export const abilitiesCatalog = catalogApi<Ability, never>('/abilities');

// Каждая правка отдаёт способности персонажа целиком (docs/server.md, «Abilities on a
// character»).
const base = (characterId: string) => `/characters/${characterId}/abilities`;

export function addAbility(
  characterId: string,
  input: CharacterAbilityAddInput,
): Promise<CharacterAbilityEntry[]> {
  return apiRequest(base(characterId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateAbility(
  characterId: string,
  entryId: string,
  input: CharacterAbilityUpdateInput,
): Promise<CharacterAbilityEntry[]> {
  return apiRequest(`${base(characterId)}/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function removeAbility(
  characterId: string,
  entryId: string,
): Promise<CharacterAbilityEntry[]> {
  return apiRequest(`${base(characterId)}/${entryId}`, { method: 'DELETE' });
}
