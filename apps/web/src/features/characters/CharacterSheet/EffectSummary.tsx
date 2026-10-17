import { Paper, Stack, Text } from '@mantine/core';
import {
  CONDITION_LABELS,
  DEFENSE_LEVEL_LABELS,
  type SheetTotals,
  type TotalLine,
} from 'shared';

interface Section {
  title: string;
  lines: TotalLine[];
}

// Что эффекты дают помимо чисел, по разделам. Пустые разделы не показываются.
function sectionsOf(totals: SheetTotals): Section[] {
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

// Сводка эффектов под боевыми числами — только в виде «С эффектами». У каждой строки —
// откуда она: названия эффектов или состояний. Видны сразу, без наведения: на телефоне
// подсказок по наведению нет.
function EffectSummary({ totals }: { totals: SheetTotals }) {
  const sections = sectionsOf(totals);
  if (sections.length === 0) return null;
  return (
    <Paper withBorder radius="md" p="xs">
      <Stack gap={6}>
        {sections.map(({ title, lines }) => (
          <div key={title}>
            <Text size="xs" c="dimmed" fw={600}>
              {title}
            </Text>
            {lines.map((line) => (
              <Text key={line.text} size="sm">
                {line.text}
                <Text span size="xs" c="dimmed">
                  {' · '}
                  {line.from.join(', ')}
                </Text>
              </Text>
            ))}
          </div>
        ))}
      </Stack>
    </Paper>
  );
}

export default EffectSummary;
