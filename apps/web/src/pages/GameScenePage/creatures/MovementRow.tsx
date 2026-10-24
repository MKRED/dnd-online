import { ActionIcon, Group, Text, Tooltip } from '@mantine/core';
import { IconRefresh, IconRun } from '@tabler/icons-react';
import type { GameFigure } from 'shared';
import { movementText } from '../allowanceLabel';
import { useFreeMove } from '../combat/MoveModeContext';

interface MovementRowProps {
  name: string;
  movement: Pick<GameFigure, 'speed' | 'climb' | 'moved' | 'dashes'>;
  // «Обновить запас» и «Рывок» — только у мастера (docs/plan/done/creature-movement.md) и
  // только в бою: вне боя запас и так полный после каждого хода.
  onAllowance?: (change: 'refresh' | 'dash') => void;
  busy: boolean;
}

// Запас движения выбранного: «Осталось 20 из 30 фт» (вне боя — «До 30 фт за ход») и, у
// мастера в бою, кнопки запаса.
function MovementRow({ name, movement, onAllowance, busy }: MovementRowProps) {
  const free = useFreeMove();
  const text = movementText(movement, free);
  return (
    <Group gap={4} wrap="nowrap" justify="space-between">
      <Text size="sm" c="dimmed">
        {text.charAt(0).toUpperCase() + text.slice(1)}
      </Text>
      {onAllowance && !free && (
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
