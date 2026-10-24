import { Paper, Stack, Text } from '@mantine/core';
import type { SheetTotals } from 'shared';
import { sectionsOf } from './effectSummarySections';

// Сводка черт и эффектов под боевыми числами: в виде «Без эффектов» — только черты. У
// каждой строки — откуда она: названия черт, эффектов или состояний. Видны сразу, без
// наведения: на телефоне подсказок по наведению нет.
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
