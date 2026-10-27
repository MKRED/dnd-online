import type { CharacterGearNumbers, SheetTotals } from 'shared';
import { changedBy } from './changedBy';

type Tile = {
  value: string;
  hint?: string;
  changedBy?: string;
  explain?: string;
  warning?: string;
};

// Плитка «Класс доспеха»: итог с эффектами или число формы. Выделена, если КД меняет хоть
// одна составляющая, даже когда число то же (Haste и Slow, Mage Armor слабее доспеха):
// подсказка объясняет, почему оно не изменилось. У персонажа КД посчитан от надетого
// (docs/plan/equipment.md, этап 3): под числом — что надето, в подсказке — из чего он
// сложен, без тренированности или настройки — предупреждение.
export function armorClassTile(
  base: number,
  totals: SheetTotals | null,
  gear?: CharacterGearNumbers,
): Tile {
  if (!totals) return { value: String(base) };
  const worn = gear?.armorClass;
  const head =
    worn && worn.lines.length > 0
      ? [
          ...worn.lines.map((line) => `${line.text}: ${line.value}`),
          ...worn.warnings.map((w) => `${w}.`),
          ...worn.unattuned.map((w) => `${w}.`),
        ]
      : undefined;
  const changed = totals.armorClassChanges.length > 0;
  return {
    value: String(totals.armorClass),
    hint: worn ? wornHint(gear) : undefined,
    changedBy: changed
      ? changedBy(String(base), totals.armorClassChanges, head)
      : undefined,
    explain: !changed && head ? head.join('\n') : undefined,
    warning: worn ? wornWarning(worn) : undefined,
  };
}

// Под числом — главное, чего не хватает; подробности — в подсказке.
function wornWarning(
  worn: CharacterGearNumbers['armorClass'],
): string | undefined {
  if (worn.warnings.length > 0) return 'Нет тренированности';
  if (worn.unattuned.length > 0) return 'Нет настройки';
  return undefined;
}

// «Кольчуга, Щит» — надетое, что даёт КД. Названия как в каталоге: «Меч Артура» со
// строчной буквы исказился бы.
function wornHint(gear: CharacterGearNumbers): string | undefined {
  const names = gear.armorClass.lines
    .map((line) => line.text)
    .filter((text) => text !== 'Без доспеха' && !text.startsWith('Ловкость'));
  if (names.length === 0) return undefined;
  return names.join(', ');
}
