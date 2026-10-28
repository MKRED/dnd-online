import { DAMAGE_PARTS_MAX } from './abilitySteps.js';
import type { DamageType } from './damageTypes.js';

// Урон в игре по частям (замечания после первой партии, 2026-10-26): удар бывает
// смешанным — 6 колющего + 4 некротического. Части те же, что строки урона у шага
// способности (DamagePart, abilitySteps.ts), только уже брошенные: когда способности начнут
// бросать сами, их урон ляжет в журнал в той же форме. Тип у ручного урона необязателен.
// У ручного урона защиты цели не применяются: мастер вводит, что прошло. У атаки на карте
// (docs/plan/combat.md, этап 5) части — уже после защит цели, а брошенное — в её записи
// журнала combat.damage.
export interface DamageDealtPart {
  amount: number;
  type: DamageType | null;
}

export const DAMAGE_DEALT_PARTS_MAX = DAMAGE_PARTS_MAX;

export function damageTotal(parts: readonly DamageDealtPart[]): number {
  return parts.reduce((sum, part) => sum + part.amount, 0);
}

// Части урона правки; у записей журнала до 2026-10-26 их нет — это одна часть без типа.
export function damageDealtParts(change: {
  amount: number;
  parts?: DamageDealtPart[];
}): DamageDealtPart[] {
  return change.parts ?? [{ amount: change.amount, type: null }];
}
