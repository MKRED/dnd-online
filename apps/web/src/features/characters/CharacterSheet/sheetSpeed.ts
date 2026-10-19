import type { SheetTotals, SpecialSpeed, SpeedTotal } from 'shared';
import { changedBy } from './changedBy';

const SPECIAL_LABELS: Record<SpecialSpeed, string> = {
  fly: 'Полёт',
  climb: 'Лазание',
  swim: 'Плавание',
  burrow: 'Копание',
};
const ORDER: readonly SpecialSpeed[] = ['fly', 'climb', 'swim', 'burrow'];

// Особые скорости строкой: «Полёт 120 фт, парит · Плавание 40 фт».
function specialsText({ special, hover }: Omit<SpeedTotal, 'speed'>): string {
  return ORDER.flatMap((kind) => {
    const feet = special[kind];
    if (feet === undefined) return [];
    const parts = `${SPECIAL_LABELS[kind]} ${feet} фт`;
    return [kind === 'fly' && hover ? `${parts}, парит` : parts];
  }).join(' · ');
}

// Без особых скоростей — так у персонажа: в форме их нет.
const NO_SPECIALS: Omit<SpeedTotal, 'speed'> = { special: {}, hover: false };

// Плитка «Скорость»: итог с эффектами или база. Особые скорости — строкой под числом
// («Полёт 120 фт, парит»); у монстра они есть и без эффектов (baseSpecials). Изменённое
// эффектами объясняет подсказка: что было без эффектов и что его изменило, по строке на
// причину.
export function speedTile(
  base: number,
  totals: SheetTotals | null,
  baseSpecials: Omit<SpeedTotal, 'speed'> = NO_SPECIALS,
): { value: string; hint?: string; changedBy?: string } {
  const baseText = specialsText(baseSpecials);
  if (!totals) return { value: `${base} фт`, hint: baseText || undefined };
  const { speed } = totals.speed;
  const text = specialsText(totals.speed);
  const changed = speed !== base || text !== baseText;
  const was = [`${base} фт`, baseText].filter(Boolean).join(', ');
  return {
    value: `${speed} фт`,
    hint: text || undefined,
    changedBy: changed ? changedBy(was, totals.speedChanges) : undefined,
  };
}
