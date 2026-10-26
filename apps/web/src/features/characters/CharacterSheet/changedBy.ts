import type { TotalLine } from 'shared';

// Подсказка числа, изменённого чертами или эффектами: что введено в форме и что его
// изменило, по строке на причину — «В форме 14.\nЩит веры: КД +2.» Не «без эффектов»:
// черты меняют число и в этом виде (docs/plan/done/traits.md).
export function changedBy(base: string, lines: readonly TotalLine[]): string {
  const reasons = lines.map(
    (line) => `${line.from.join(', ')}: ${line.text.replace(/\.?$/, '.')}`,
  );
  return [`В форме ${base}.`, ...reasons].join('\n');
}
