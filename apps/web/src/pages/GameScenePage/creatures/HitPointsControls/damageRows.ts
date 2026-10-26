import {
  DAMAGE_DEALT_PARTS_MAX,
  type DamageDealtPart,
  type DamageType,
} from 'shared';

// Строка ввода хитов: число (пустое — '') и тип урона (null — без типа). Лечение и
// временные хиты берут сумму строк, урон — строки частями (shared/damageDealt.ts).
export interface DamageRow {
  amount: number | string;
  type: DamageType | null;
}

export const EMPTY_ROW: DamageRow = { amount: '', type: null };

// Заполненные строки частями урона; пустые не в счёт.
export function filledParts(rows: readonly DamageRow[]): DamageDealtPart[] {
  return rows.flatMap((row) =>
    typeof row.amount === 'number'
      ? [{ amount: row.amount, type: row.type }]
      : [],
  );
}

// После правки числа стираются, а строки с типами остаются: серия одинаковых ударов —
// только числа (вариант 1, 2026-10-26).
export const clearedRows = (rows: readonly DamageRow[]): DamageRow[] =>
  rows.map((row) => ({ ...row, amount: '' }));

export const canAddRow = (rows: readonly DamageRow[]) =>
  rows.length < DAMAGE_DEALT_PARTS_MAX;
