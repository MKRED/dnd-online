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

// Правки инвентаря, которыми пользуется список: на листе — адреса персонажа, в игре — адреса
// игры (мастер кладёт вещи героям, docs/plan/gm-items.md, этап 1). Каждая отдаёт инвентарь.
export interface InventoryActions {
  add: (input: InventoryAddInput) => Promise<InventoryEntry[]>;
  setQuantity: (entryId: string, quantity: number) => Promise<InventoryEntry[]>;
  move: (
    entryId: string,
    input: InventoryMoveInput,
  ) => Promise<InventoryEntry[]>;
  remove: (entryId: string) => Promise<InventoryEntry[]>;
}

export function sheetInventoryActions(characterId: string): InventoryActions {
  return {
    add: (input) => addInventoryItem(characterId, input),
    setQuantity: (entryId, quantity) =>
      updateInventoryEntry(characterId, entryId, { quantity }),
    move: (entryId, input) => moveInventoryEntry(characterId, entryId, input),
    remove: (entryId) => removeInventoryEntry(characterId, entryId),
  };
}
