import type { TotalLine } from 'shared';

// Подсказка изменённого эффектами числа: что было без эффектов и что его изменило, по
// строке на причину — «Без эффектов 14.\nЩит веры: КД +2.»
export function changedBy(base: string, lines: readonly TotalLine[]): string {
  const reasons = lines.map(
    (line) => `${line.from.join(', ')}: ${line.text.replace(/\.?$/, '.')}`,
  );
  return [`Без эффектов ${base}.`, ...reasons].join('\n');
}
