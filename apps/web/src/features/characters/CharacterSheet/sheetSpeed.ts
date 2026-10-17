import type { SheetTotals, SpecialSpeed } from 'shared';
import { changedBy } from './changedBy';

const SPECIAL_LABELS: Record<SpecialSpeed, string> = {
  fly: 'Полёт',
  climb: 'Лазание',
  swim: 'Плавание',
  burrow: 'Копание',
};
const ORDER: readonly SpecialSpeed[] = ['fly', 'climb', 'swim', 'burrow'];

// Плитка «Скорость»: итог с эффектами или база из формы. Особые скорости — строкой под
// числом («Полёт 120 фт, парит»). Изменённое эффектами объясняет подсказка: что было без
// эффектов и что его изменило, по строке на причину.
export function speedTile(
  base: number,
  totals: SheetTotals | null,
): { value: string; hint?: string; changedBy?: string } {
  if (!totals) return { value: `${base} фт` };
  const { speed, special, hover } = totals.speed;
  const specials = ORDER.flatMap((kind) => {
    const feet = special[kind];
    if (feet === undefined) return [];
    const parts = `${SPECIAL_LABELS[kind]} ${feet} фт`;
    return [kind === 'fly' && hover ? `${parts}, парит` : parts];
  });
  const changed = speed !== base || specials.length > 0;
  return {
    value: `${speed} фт`,
    hint: specials.length > 0 ? specials.join(' · ') : undefined,
    changedBy: changed
      ? changedBy(`${base} фт`, totals.speedChanges)
      : undefined,
  };
}
