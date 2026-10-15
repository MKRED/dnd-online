import type { CatalogImage } from './catalogImage.js';
import type { ItemCategory, ItemRarity } from './items.js';

// Инвентарь персонажа (docs/plan/character-inventory.md): строки ссылаются на предметы
// каталога. «При себе» входит в груз, «Хранилище» — без лимита и в груз не входит.
export const INVENTORY_LOCATIONS = ['carried', 'stash'] as const;
export type InventoryLocation = (typeof INVENTORY_LOCATIONS)[number];

// Один предмет в одном месте — одна строка с количеством.
export const INVENTORY_MAX_QUANTITY = 9999;

// Краткая карточка предмета — чтобы показать строку без отдельного запроса.
export interface InventoryItemCard {
  id: string;
  name: string;
  category: ItemCategory;
  rarity: ItemRarity;
  weight: number;
  isPublic: boolean;
  image: CatalogImage | null;
}

// Почему у строки нет карточки: автор скрыл предмет от смотрящего или удалил его.
// Такую строку можно только убрать; данные карточки (даже вес) не раскрываются.
export type InventoryMissing = 'hidden' | 'deleted';

export type InventoryEntry = {
  id: string;
  location: InventoryLocation;
  quantity: number;
} & (
  | {
      item: InventoryItemCard;
      missing: null;
      // Предмет скрыт от владельца персонажа, но виден смотрящему — его автору на чужом
      // листе. Свои предметы автор видит всегда, а на персонажа скрытый не действует:
      // карточка есть, в груз строка не входит (вариант Б, решено с пользователем).
      inactive: boolean;
    }
  | { item: null; missing: InventoryMissing }
);

// Добавить предмет каталога; тот же предмет в том же месте прибавляется к количеству.
// unpack — набор кладётся не целиком, а своим составом × quantity; скрытые от игрока
// предметы состава не кладутся.
export interface InventoryAddInput {
  itemId: string;
  quantity: number;
  location: InventoryLocation;
  unpack?: boolean;
}

// Изменить строку: количество или место. Перенос туда, где предмет уже есть, складывает строки.
export interface InventoryEntryPatch {
  quantity?: number;
  location?: InventoryLocation;
}

// Переложить часть стопки (или всю) в другое место: quantity — сколько переложить.
export interface InventoryMoveInput {
  location: InventoryLocation;
  quantity: number;
}
