import {
  passivePerceptionBase,
  type Character,
  type SheetTotals,
} from 'shared';
import { changedBy } from './changedBy';

// Плитка «Пассивное восприятие»: 10 + бонус проверки Мудрости (Восприятие), с эффектами —
// ещё ±5 за преимущество или помеху и числа бонусов (docs/dnd/combat-stats.md).
export function perceptionTile(
  character: Character,
  totals: SheetTotals | null,
): { value: string; changedBy?: string } {
  const base = passivePerceptionBase(character);
  if (!totals || totals.perception.lines.length === 0) {
    return { value: String(base) };
  }
  return {
    value: String(base + totals.perception.shift),
    changedBy: changedBy(String(base), totals.perception.lines),
  };
}
