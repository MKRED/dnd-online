import type {
  InventoryAddInput,
  InventoryEntry,
  InventoryEntryPatch,
  InventoryMoveInput,
} from 'shared';
import { apiRequest } from '../../../lib/apiRequest';

// Каждая правка отдаёт инвентарь целиком (docs/server.md, «Character inventory»).
const base = (characterId: string) => `/characters/${characterId}/items`;

export function addInventoryItem(
  characterId: string,
  input: InventoryAddInput,
): Promise<InventoryEntry[]> {
  return apiRequest(base(characterId), {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function updateInventoryEntry(
  characterId: string,
  entryId: string,
  patch: InventoryEntryPatch,
): Promise<InventoryEntry[]> {
  return apiRequest(`${base(characterId)}/${entryId}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}

export function moveInventoryEntry(
  characterId: string,
  entryId: string,
  input: InventoryMoveInput,
): Promise<InventoryEntry[]> {
  return apiRequest(`${base(characterId)}/${entryId}/move`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export function removeInventoryEntry(
  characterId: string,
  entryId: string,
): Promise<InventoryEntry[]> {
  return apiRequest(`${base(characterId)}/${entryId}`, { method: 'DELETE' });
}
