import type { ItemCategory, ItemImage, ItemRarity } from './items.js';

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
  image: ItemImage | null;
}

// Почему у строки нет карточки: автор скрыл предмет от смотрящего или удалил его.
// Такую строку можно только убрать; данные карточки (даже вес) не раскрываются.
export type InventoryMissing = 'hidden' | 'deleted';

export type InventoryEntry = {
  id: string;
  location: InventoryLocation;
  quantity: number;
} & (
  | { item: InventoryItemCard; missing: null }
  | { item: null; missing: InventoryMissing }
);

// Добавить предмет каталога; тот же предмет в том же месте прибавляется к количеству.
export interface InventoryAddInput {
  itemId: string;
  quantity: number;
  location: InventoryLocation;
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
