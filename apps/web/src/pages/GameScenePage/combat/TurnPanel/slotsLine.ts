import type { SpellSlots } from 'shared';

// Ячейки строкой над значками: «1 ●●○ · 2 ●○» — свободные закрашены. Нет ячеек — null.
export function slotsLine(slots: SpellSlots | null): string | null {
  if (!slots) return null;
  const parts = Object.entries(slots)
    .flatMap(([level, slot]) =>
      slot && slot.total > 0 ? [{ level: Number(level), ...slot }] : [],
    )
    .sort((a, b) => a.level - b.level)
    .map(({ level, total, expended }) => {
      const free = Math.max(0, total - expended);
      return `${level} ${'●'.repeat(free)}${'○'.repeat(total - free)}`;
    });
  return parts.length > 0 ? parts.join(' · ') : null;
}
