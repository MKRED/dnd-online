import { Paper, Stack, Text } from '@mantine/core';
import { RecordLink } from '../../catalog';
import type { AppliedEffectRow } from './appliedEffects';

// Список эффектов и черт на существе: у каждого — откуда он и что даёт. Имя открывает
// запись (на сцене игры — её окно). Не действующий — серый, с причиной.
function AppliedEffectList({ rows }: { rows: AppliedEffectRow[] }) {
  if (rows.length === 0) {
    return (
      <Text size="sm" c="dimmed">
        Эффектов нет.
      </Text>
    );
  }
  return (
    <Stack gap="xs">
      {rows.map((row) => (
        <Paper
          key={row.key}
          withBorder
          radius="md"
          p="xs"
          opacity={row.idle ? 0.6 : 1}
        >
          <Text size="sm" fw={600}>
            {row.id ? (
              <RecordLink kind={row.kind} id={row.id} name={row.name} inherit>
                {row.name}
              </RecordLink>
            ) : (
              row.name
            )}
            <Text span size="xs" c="dimmed" fw={400}>
              {' · '}
              {row.source}
              {row.idle && `, ${row.idle}`}
            </Text>
          </Text>
          {row.lines.map((line, index) => (
            <div key={index}>
              <Text size="sm">{line.text}</Text>
              {line.details.map((detail) => (
                <Text key={detail} size="xs" c="dimmed" pl="sm">
                  {detail}
                </Text>
              ))}
            </div>
          ))}
        </Paper>
      ))}
    </Stack>
  );
}

export default AppliedEffectList;
