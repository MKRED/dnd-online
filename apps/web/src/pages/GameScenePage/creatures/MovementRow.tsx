import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconRefresh, IconRun } from '@tabler/icons-react';
import type { GameFigure } from 'shared';
import { allowanceLabel } from '../allowanceLabel';

interface MovementRowProps {
  name: string;
  movement: Pick<GameFigure, 'speed' | 'climb' | 'moved' | 'dashes'>;
  // «Обновить запас» и «Рывок» — только у мастера (docs/plan/done/creature-movement.md).
  onAllowance?: (change: 'refresh' | 'dash') => void;
  busy: boolean;
}

// Запас движения выбранного: «Осталось 20 из 30 фт» и, у мастера, кнопки запаса.
function MovementRow({ name, movement, onAllowance, busy }: MovementRowProps) {
  return (
    <Group gap={4} wrap="nowrap" justify="space-between">
      <Text size="sm" c="dimmed">
        Осталось {allowanceLabel(movement)}
      </Text>
      {onAllowance && (
        <Group gap={2} wrap="nowrap">
          <Tooltip label="Обновить запас: новый ход" withArrow>
            <ActionIcon
              variant="subtle"
              aria-label={`Обновить запас: ${name}`}
              disabled={busy}
              onClick={() => onAllowance('refresh')}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Рывок: ещё одна Скорость на этот ход" withArrow>
            <ActionIcon
              variant="subtle"
              aria-label={`Рывок: ${name}`}
              disabled={busy}
              onClick={() => onAllowance('dash')}
            >
              <IconRun size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      )}
    </Group>
  );
}

export default MovementRow;
