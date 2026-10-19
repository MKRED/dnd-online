import type { SpellSlots } from './character.js';

// Ячейки заклинаний вводит игрок по таблице своего класса (docs/plan/done/character-abilities.md).
// В таблицах 2024 больше 4 ячеек одного круга не бывает; предел 9 — запас для хоумбрю и
// предметов, а не правило книги. Он же держит ряд кружков на листе в одну строку.
export const SPELL_SLOT_TOTAL_MAX = 9;
export const SPELL_SLOT_CIRCLES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const;
export type SpellSlotCircle = (typeof SPELL_SLOT_CIRCLES)[number];

// Сколько ячеек потрачено, по кругам: точечная правка листа (PATCH), а не вся запись.
export type SpellSlotsExpended = Partial<Record<SpellSlotCircle, number>>;

export type SpendSpellSlotsResult =
  { ok: true; slots: SpellSlots } | { ok: false; level: SpellSlotCircle };

// Новые потраченные поверх текущих ячеек. Круг, где потрачено больше, чем ячеек, —
// ошибка с этим кругом (у круга без ячеек их 0). Ноль у круга без ячеек ничего не
// добавляет: «Долгий отдых» шлёт нули по всем кругам.
export function spendSpellSlots(
  current: SpellSlots,
  expended: SpellSlotsExpended,
): SpendSpellSlotsResult {
  const slots: SpellSlots = { ...current };
  for (const level of SPELL_SLOT_CIRCLES) {
    const spent = expended[level];
    if (spent === undefined) continue;
    const total = current[level]?.total ?? 0;
    if (spent > total) return { ok: false, level };
    if (current[level]) slots[level] = { total, expended: spent };
  }
  return { ok: true, slots };
}

// Все ячейки снова полные — после долгого отдыха (docs/dnd/ability-usage.md, «Spell slot»).
export function longRestExpended(current: SpellSlots): SpellSlotsExpended {
  return Object.fromEntries(
    SPELL_SLOT_CIRCLES.filter((level) => current[level]).map((level) => [
      level,
      0,
    ]),
  );
}
