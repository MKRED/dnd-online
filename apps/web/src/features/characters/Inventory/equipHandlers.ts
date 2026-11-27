import type { EquipSlot, InventoryEntry } from 'shared';
import { equipEntry, setAttunement, unequipSlot } from '../Equipment';
import type { EquipmentPlay } from '../Equipment';

export interface EquipHandlers {
  onEquip: (entry: InventoryEntry, slot: EquipSlot) => void;
  onUnequip: (entry: InventoryEntry, slot: EquipSlot) => void;
  onAttune: (entry: InventoryEntry, attuned: boolean) => void;
}

type Run = (
  key: string,
  request: () => Promise<InventoryEntry[]>,
  failure: string,
) => Promise<boolean>;

type EquipRequests = Pick<EquipmentPlay, 'equip' | 'unequip' | 'attune'>;

// Кукла адресами листа; в игре вместо неё — адреса игры (EquipmentPlay).
export function sheetEquipRequests(characterId: string): EquipRequests {
  return {
    equip: (slot, entryId) => equipEntry(characterId, slot, entryId),
    unequip: (slot) => unequipSlot(characterId, slot),
    attune: (entryId, attuned) => setAttunement(characterId, entryId, attuned),
  };
}

// Надеть, снять и настроиться из меню строки — те же правки, что на кукле; строка занята,
// пока запрос в пути (useInventoryEditor).
export function equipHandlers(
  requests: EquipRequests,
  run: Run,
): EquipHandlers {
  return {
    onEquip: (entry, slot) =>
      void run(
        entry.id,
        () => requests.equip(slot, entry.id),
        'Не удалось надеть вещь',
      ),
    onUnequip: (entry, slot) =>
      void run(entry.id, () => requests.unequip(slot), 'Не удалось снять вещь'),
    onAttune: (entry, attuned) =>
      void run(
        entry.id,
        () => requests.attune(entry.id, attuned),
        attuned ? 'Не удалось настроиться' : 'Не удалось снять настройку',
      ),
  };
}
