import type { SpellSlotLevel, SpellSlots } from 'shared';

// Ячейки одного круга точками: «●●○» — свободные закрашены. Ячеек нет — null.
export function slotDots(slot: SpellSlotLevel | undefined): string | null {
  if (!slot || slot.total <= 0) return null;
  const free = Math.max(0, slot.total - slot.expended);
  return `${'●'.repeat(free)}${'○'.repeat(slot.total - free)}`;
}

// Ячейки строкой над значками: «1 ●●○ · 2 ●○». shown — круги, чьи точки уже стоят у
// подзаголовка заклинаний: в строке остаются только ячейки кругов без своих заклинаний
// (ими можно применить заклинание пониже). Нечего показать — null.
export function slotsLine(
  slots: SpellSlots | null,
  shown: ReadonlySet<number> = new Set(),
): string | null {
  if (!slots) return null;
  const parts = Object.entries(slots)
    .map(([level, slot]) => ({ level: Number(level), dots: slotDots(slot) }))
    .filter(({ level, dots }) => dots !== null && !shown.has(level))
    .sort((a, b) => a.level - b.level)
    .map(({ level, dots }) => `${level} ${dots}`);
  return parts.length > 0 ? parts.join(' · ') : null;
}
