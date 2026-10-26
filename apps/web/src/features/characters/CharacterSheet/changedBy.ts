import type { TotalLine } from 'shared';

// Подсказка числа, изменённого чертами или эффектами: что введено в форме и что его
// изменило, по строке на причину — «В форме 14.\nЩит веры: КД +2.» Не «без эффектов»:
// черты меняют число и в этом виде (docs/plan/done/traits.md). head — свои первые
// строки вместо «В форме N.»: у КД — из чего он сложен от надетого.
export function changedBy(
  base: string,
  lines: readonly TotalLine[],
  head: readonly string[] = [`В форме ${base}.`],
): string {
  const reasons = lines.map(
    (line) => `${line.from.join(', ')}: ${line.text.replace(/\.?$/, '.')}`,
  );
  return [...head, ...reasons].join('\n');
}
