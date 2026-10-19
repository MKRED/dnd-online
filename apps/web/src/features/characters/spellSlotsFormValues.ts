import {
  SPELL_SLOT_CIRCLES,
  type SpellSlotCircle,
  type SpellSlots,
  type SpellSlotsExpended,
} from 'shared';

// Число ячеек по кругам — то, что вводится в форме; 0 — у круга ячеек нет.
export type SpellSlotTotals = Record<SpellSlotCircle, number>;

export function emptySpellSlotTotals(): SpellSlotTotals {
  return Object.fromEntries(
    SPELL_SLOT_CIRCLES.map((level) => [level, 0]),
  ) as SpellSlotTotals;
}

export function spellSlotTotals(slots: SpellSlots): SpellSlotTotals {
  const totals = emptySpellSlotTotals();
  for (const level of SPELL_SLOT_CIRCLES) {
    totals[level] = slots[level]?.total ?? 0;
  }
  return totals;
}

export function spellSlotsExpended(slots: SpellSlots): SpellSlotsExpended {
  return Object.fromEntries(
    SPELL_SLOT_CIRCLES.filter((level) => slots[level]).map((level) => [
      level,
      slots[level]!.expended,
    ]),
  );
}

// Форма меняет только число ячеек, а потраченные отмечаются на листе. Поэтому
// потраченные берём из загруженного персонажа и урезаем до нового числа: правка
// формы их не сбрасывает (docs/plan/done/character-abilities.md, «Форма и потраченные»).
// Круг с 0 ячеек не отправляем — у него ячеек нет.
export function toSpellSlots(
  totals: SpellSlotTotals,
  expended: SpellSlotsExpended,
): SpellSlots {
  const slots: SpellSlots = {};
  for (const level of SPELL_SLOT_CIRCLES) {
    const total = totals[level];
    if (total > 0) {
      slots[level] = { total, expended: Math.min(expended[level] ?? 0, total) };
    }
  }
  return slots;
}
