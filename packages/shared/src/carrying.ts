import type { InventoryEntry } from './inventory.js';

// Грузоподъёмность по правилам 2024 (docs/dnd/carrying.md): Маленький и Средний — Сила × 15
// нести и Сила × 30 тащить, поднять, толкать. Все игровые виды такого размера. Голиафа
// («Мощное телосложение») пока не учитываем — решено с пользователем: черты будут менять
// характеристики сами, когда появятся у персонажа.
export const CARRY_PER_STRENGTH = 15;
export const DRAG_LIFT_PUSH_PER_STRENGTH = 30;

export interface CarryingCapacity {
  carry: number;
  dragLiftPush: number;
}

export function carryingCapacity(strength: number): CarryingCapacity {
  return {
    carry: strength * CARRY_PER_STRENGTH,
    dragLiftPush: strength * DRAG_LIFT_PUSH_PER_STRENGTH,
  };
}

export interface CarriedLoad {
  // Фунты, до сотых.
  weight: number;
  // Строки «При себе» без карточки (скрыты или удалены): в груз не входят. Нужны, чтобы
  // подписать груз «без скрытых предметов».
  missing: number;
}

// Груз — только «При себе» и только предметы, которые видны смотрящему. Скрытый предмет
// на персонажа не действует (решено с пользователем), удалённого нет вовсе.
export function carriedLoad(entries: readonly InventoryEntry[]): CarriedLoad {
  let hundredths = 0;
  let missing = 0;
  for (const entry of entries) {
    if (entry.location !== 'carried') continue;
    if (entry.item === null) {
      missing += 1;
      continue;
    }
    // Считаем в сотых фунта целыми: 0.1 × 3 в дробях даёт 0.30000000000000004.
    hundredths += Math.round(entry.item.weight * 100) * entry.quantity;
  }
  return { weight: hundredths / 100, missing };
}
