import type { CharacterCurrency } from './character.js';
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
  // Строки «При себе», которые в груз не вошли: скрыты от смотрящего, удалены или не
  // действуют на персонажа. Нужны, чтобы подписать груз «без скрытых предметов».
  excluded: number;
  // Из weight — вес монет кошелька, фунты до сотых.
  coins: number;
}

// 50 монет любого номинала — фунт (PHB 2024, «Coins»; docs/dnd/items.md). В сотых фунта:
// монета — две сотых, так что дробей нет.
export const COINS_PER_POUND = 50;

export function coinWeightHundredths(currency: CharacterCurrency): number {
  const coins =
    currency.cp + currency.sp + currency.ep + currency.gp + currency.pp;
  return (coins * 100) / COINS_PER_POUND;
}

// Груз — только «При себе» и только предметы, которые видны смотрящему и действуют на
// персонажа. Скрытый предмет на персонажа не действует (решено с пользователем),
// удалённого нет вовсе. Кошелёк весь при себе: хранилища у денег нет (решено с
// пользователем 2026-11-27).
export function carriedLoad(
  entries: readonly InventoryEntry[],
  currency?: CharacterCurrency,
): CarriedLoad {
  let hundredths = 0;
  let excluded = 0;
  for (const entry of entries) {
    if (entry.location !== 'carried') continue;
    if (entry.item === null || entry.inactive) {
      excluded += 1;
      continue;
    }
    // Считаем в сотых фунта целыми: 0.1 × 3 в дробях даёт 0.30000000000000004.
    hundredths += Math.round(entry.item.weight * 100) * entry.quantity;
  }
  const coins = currency ? coinWeightHundredths(currency) : 0;
  return { weight: (hundredths + coins) / 100, excluded, coins: coins / 100 };
}
