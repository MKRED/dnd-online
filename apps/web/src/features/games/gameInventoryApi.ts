import type { Character, InventoryAddInput, InventoryMoveInput } from 'shared';
import { apiRequest as request } from '../../lib/apiRequest';
import { gameCharacterBase } from './gameStateApi';

// Инвентарь героя в игре правит мастер (docs/plan/gm-items.md, этап 1): адреса — как у
// листа, под игрой; ответ — лист целиком (груз, кукла и КД зависят от вещей).
const base = (gameId: string, characterId: string) =>
  `${gameCharacterBase(gameId, characterId)}/items`;

export function addGameInventoryItem(
  gameId: string,
  characterId: string,
  input: InventoryAddInput,
): Promise<Character> {
  return request(base(gameId, characterId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function moveGameInventoryEntry(
  gameId: string,
  characterId: string,
  entryId: string,
  input: InventoryMoveInput,
): Promise<Character> {
  return request(`${base(gameId, characterId)}/${entryId}/move`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function setGameInventoryQuantity(
  gameId: string,
  characterId: string,
  entryId: string,
  quantity: number,
): Promise<Character> {
  return request(`${base(gameId, characterId)}/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export function removeGameInventoryEntry(
  gameId: string,
  characterId: string,
  entryId: string,
): Promise<Character> {
  return request(`${base(gameId, characterId)}/${entryId}`, {
    method: 'DELETE',
  });
}
