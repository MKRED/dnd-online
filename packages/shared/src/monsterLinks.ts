import type { EffectLink } from './characterEffects.js';
import type { ItemLink } from './inventory.js';

// Снаряжение и эффекты монстра (docs/plan/done/monsters-npcs.md, этап 6): ссылки на каталоги,
// как у персонажа. Снаряжение — один список с количеством, без «При себе», хранилища,
// денег и груза: это строка Gear книги, то, что можно забрать с тела.

export type MonsterItemEntry = { id: string; quantity: number } & ItemLink;

// Один предмет — одна строка; повтор — 409, количество меняют правкой строки.
// Предел количества — INVENTORY_MAX_QUANTITY, как в инвентаре.
export interface MonsterItemAddInput {
  itemId: string;
  quantity: number;
}

export interface MonsterItemUpdateInput {
  quantity: number;
}

// Постоянные эффекты шаблона монстра — плашки вверху карточки, как у персонажа.
export type MonsterEffectEntry = { id: string } & EffectLink;

export interface MonsterEffectAddInput {
  effectId: string;
}
