import type { SheetTotals } from 'shared';
import { changedBy } from './changedBy';

// Плитка «Класс доспеха»: итог с эффектами или число формы. Выделена, если КД меняет хоть
// одна составляющая, даже когда число то же (Haste и Slow, Mage Armor слабее доспеха):
// подсказка объясняет, почему оно не изменилось.
export function armorClassTile(
  base: number,
  totals: SheetTotals | null,
): { value: string; changedBy?: string } {
  if (!totals) return { value: String(base) };
  return {
    value: String(totals.armorClass),
    changedBy:
      totals.armorClassChanges.length > 0
        ? changedBy(String(base), totals.armorClassChanges)
        : undefined,
  };
}
