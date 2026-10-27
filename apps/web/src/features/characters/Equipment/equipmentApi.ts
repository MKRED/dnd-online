import type { EquipSlot, InventoryEntry } from 'shared';
import { apiRequest } from '../../../lib/apiRequest';

// Кукла и настройка (docs/server.md, «Character equipment»): каждая правка отдаёт
// инвентарь целиком — надетое и настройка лежат в его строках.
const character = (characterId: string) => `/characters/${characterId}`;

export function equipEntry(
  characterId: string,
  slot: EquipSlot,
  entryId: string,
): Promise<InventoryEntry[]> {
  return apiRequest(`${character(characterId)}/equipment/${slot}`, {
    method: 'PUT',
    body: JSON.stringify({ entryId }),
  });
}

export function unequipSlot(
  characterId: string,
  slot: EquipSlot,
): Promise<InventoryEntry[]> {
  return apiRequest(`${character(characterId)}/equipment/${slot}`, {
    method: 'DELETE',
  });
}

export function setAttunement(
  characterId: string,
  entryId: string,
  attuned: boolean,
): Promise<InventoryEntry[]> {
  return apiRequest(`${character(characterId)}/items/${entryId}/attunement`, {
    method: attuned ? 'PUT' : 'DELETE',
  });
}

// Кукла во время встречи (docs/plan/equipment.md, этап 4): правки идут адресами игры, а
// combat — тактический режим, где доспех и настройку не сменить.
export interface EquipmentPlay {
  combat: boolean;
  equip: (slot: EquipSlot, entryId: string) => Promise<InventoryEntry[]>;
  unequip: (slot: EquipSlot) => Promise<InventoryEntry[]>;
  attune: (entryId: string, attuned: boolean) => Promise<InventoryEntry[]>;
}
