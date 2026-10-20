import { ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import type { MapObjectSummary } from 'shared';
import classes from './ObjectsPanel.module.css';

interface ObjectListProps {
  summaries: MapObjectSummary[];
  selectedId: number | null;
  // Выделить объект и перенести к нему центр камеры.
  onPick: (id: number) => void;
}

// Список «На карте»: все объекты по номерам, с предупреждениями сводки. Клик выделяет
// объект и переносит к нему центр камеры — так находят то, что не видно на сцене.
function ObjectList({ summaries, selectedId, onPick }: ObjectListProps) {
  return (
    <Stack gap={4}>
      <Text size="sm">На карте: {summaries.length}</Text>
      {summaries.length === 0 ? (
        <Text size="xs" c="dimmed">
          Объектов пока нет.
        </Text>
      ) : (
        <ScrollArea.Autosize mah={240} type="auto">
          <Stack gap={2}>
            {summaries.map((summary) => (
              <UnstyledButton
                key={summary.id}
                className={classes.row}
                data-selected={summary.id === selectedId || undefined}
                aria-pressed={summary.id === selectedId}
                onClick={() => onPick(summary.id)}
              >
                <Text size="sm" lineClamp={1}>
                  <Text span c="dimmed" size="xs">
                    №{summary.id}
                  </Text>{' '}
                  {summary.label}
                </Text>
                {summary.warnings.length > 0 && (
                  <Text size="xs" c="orange" lineClamp={1}>
                    {summary.warnings.join(', ')}
                  </Text>
                )}
              </UnstyledButton>
            ))}
          </Stack>
        </ScrollArea.Autosize>
      )}
    </Stack>
  );
}

export default ObjectList;
