import {
  CONDITION_LABELS,
  DEFENSE_LEVEL_LABELS,
  type SheetTotals,
  type TotalLine,
} from 'shared';

export interface Section {
  title: string;
  lines: TotalLine[];
}

// Что черты и эффекты дают помимо чисел, по разделам. Пустые разделы не показываются.
export function sectionsOf(totals: SheetTotals): Section[] {
  return [
    {
      title: 'Состояния',
      lines: totals.conditions.map(({ kind, from }) => ({
        text: CONDITION_LABELS[kind],
        from,
      })),
    },
    {
      title: 'Защита',
      lines: totals.defenses.map(({ level, text, from }) => ({
        text: `${DEFENSE_LEVEL_LABELS[level]}: ${text}`,
        from,
      })),
    },
    { title: 'Чувства', lines: totals.senses },
    { title: 'Броски', lines: totals.rolls },
    {
      title: 'Каждый ход',
      lines: [
        ...totals.perTurn,
        ...(totals.noHealing.length > 0
          ? [{ text: 'Лечение не действует', from: totals.noHealing }]
          : []),
      ],
    },
  ].filter((section) => section.lines.length > 0);
}

// Есть ли что показать в сводке: черты и эффекты дают хоть одну строку.
export const hasSummary = (totals: SheetTotals) =>
  sectionsOf(totals).length > 0;
