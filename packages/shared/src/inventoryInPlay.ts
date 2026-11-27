import type { InventoryLocation } from './inventory.js';

// Правка инвентаря героя мастером в игре (docs/plan/gm-items.md, этап 1): положить предмет
// справочника, переложить между «При себе» и «Хранилищем», поменять количество, убрать.
// Для журнала — что просили сделать.
export type GameInventoryChange =
  | {
      kind: 'add';
      itemId: string;
      quantity: number;
      location: InventoryLocation;
      unpack?: boolean;
    }
  | {
      kind: 'move';
      entryId: string;
      quantity: number;
      location: InventoryLocation;
    }
  | { kind: 'quantity'; entryId: string; quantity: number }
  | { kind: 'remove'; entryId: string };

// Положить герою можно только опубликованный предмет: скрытый игрок увидел бы как «Скрытый
// предмет» без названия (решено с пользователем 2026-11-27, этап 1).
export const GAME_INVENTORY_NOT_PUBLIC =
  'Положить герою можно только опубликованный предмет';
export const GAME_INVENTORY_MASTER_ONLY =
  'Класть и перекладывать вещи героя в игре может только мастер';
