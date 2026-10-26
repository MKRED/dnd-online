import type { EquipSlot, InventoryEntry } from 'shared';
import { equipEntry, setAttunement, unequipSlot } from '../Equipment';

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

// Надеть, снять и настроиться из меню строки — те же правки, что на кукле; строка занята,
// пока запрос в пути (useInventoryEditor).
export function equipHandlers(characterId: string, run: Run): EquipHandlers {
  return {
    onEquip: (entry, slot) =>
      void run(
        entry.id,
        () => equipEntry(characterId, slot, entry.id),
        'Не удалось надеть вещь',
      ),
    onUnequip: (entry, slot) =>
      void run(
        entry.id,
        () => unequipSlot(characterId, slot),
        'Не удалось снять вещь',
      ),
    onAttune: (entry, attuned) =>
      void run(
        entry.id,
        () => setAttunement(characterId, entry.id, attuned),
        attuned ? 'Не удалось настроиться' : 'Не удалось снять настройку',
      ),
  };
}
