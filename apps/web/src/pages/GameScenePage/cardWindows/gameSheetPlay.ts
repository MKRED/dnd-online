import type { Character } from 'shared';
import type { EquipmentPlay } from '../../../features/characters/Equipment';
import type { InventoryPlay } from '../../../features/characters/Inventory';
import {
  addGameInventoryItem,
  attuneGameCharacter,
  equipGameCharacter,
  moveGameInventoryEntry,
  removeGameInventoryEntry,
  setGameInventoryQuantity,
  unequipGameCharacter,
} from '../../../features/games';

// Кукла героя адресами игры: ответ — лист целиком, окно показывает его сразу.
export function gameEquipment(
  gameId: string,
  characterId: string,
  combat: boolean,
  apply: (next: Character) => void,
): EquipmentPlay {
  const applied = (next: Character) => {
    apply(next);
    return next.inventory;
  };
  return {
    combat,
    equip: (slot, entryId) =>
      equipGameCharacter(gameId, characterId, slot, entryId).then(applied),
    unequip: (slot) =>
      unequipGameCharacter(gameId, characterId, slot).then(applied),
    attune: (entryId, attuned) =>
      attuneGameCharacter(gameId, characterId, entryId, attuned).then(applied),
  };
}

// Инвентарь героя адресами игры у мастера; меню строки надевает куклой игры.
export function gameInventory(
  gameId: string,
  characterId: string,
  combat: boolean,
  apply: (next: Character) => void,
): InventoryPlay {
  const applied = (next: Character) => {
    apply(next);
    return next.inventory;
  };
  return {
    actions: {
      add: (input) =>
        addGameInventoryItem(gameId, characterId, input).then(applied),
      move: (entryId, input) =>
        moveGameInventoryEntry(gameId, characterId, entryId, input).then(
          applied,
        ),
      setQuantity: (entryId, quantity) =>
        setGameInventoryQuantity(gameId, characterId, entryId, quantity).then(
          applied,
        ),
      remove: (entryId) =>
        removeGameInventoryEntry(gameId, characterId, entryId).then(applied),
    },
    equipment: gameEquipment(gameId, characterId, combat, apply),
  };
}
