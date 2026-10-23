import {
  ActionIcon,
  Alert,
  Group,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import { IconRefresh, IconRun } from '@tabler/icons-react';
import { creatureHealthLabel, type GameCreature } from 'shared';
import { allowanceLabel } from '../allowanceLabel';
import classes from './creatures.module.css';

interface CreaturesPanelProps {
  creatures: readonly GameCreature[];
  selectedId: number | null;
  onSelect: (objectId: number | null) => void;
  // Запас движения существа: обновить или «Рывок» (docs/plan/done/creature-movement.md).
  onAllowance: (objectId: number, change: 'refresh' | 'dash') => void;
  busy: boolean;
  // Выбранное существо можно водить: подсказка про ход.
  moving: boolean;
  error: string | null;
}

// Монстры и НПС сцены у мастера (docs/plan/done/game.md, этап 8): хиты, метка здоровья и
// запас движения; щелчок выбирает существо — его карточка ниже, на карте видно, куда оно
// дойдёт. Выбрать можно и щелчком по нему на карте.
function CreaturesPanel({
  creatures,
  selectedId,
  onSelect,
  onAllowance,
  busy,
  moving,
  error,
}: CreaturesPanelProps) {
  const shown = creatures.filter((creature) => creature.state);
  if (shown.length === 0) return null;
  const selected = shown.find((creature) => creature.objectId === selectedId);
  const hint = !selected
    ? 'Выберите существо — щелчком по нему или по имени.'
    : selected.health === 'down'
      ? 'Поверженное существо не ходит. Esc — снять выбор.'
      : moving
        ? 'Щёлкните подсвеченную клетку — существо пойдёт туда. Esc — снять выбор.'
        : 'Ходит существо в режиме «Игра»; в «Правке» его переносят инструментом «Поставить». Esc — снять выбор.';
  return (
    <Stack gap={4}>
      <Text fw={600} size="sm">
        Существа
      </Text>
      {shown.map(({ objectId, state, health }) => (
        <Group key={objectId} gap={4} wrap="nowrap">
          <UnstyledButton
            className={classes.row}
            data-selected={selectedId === objectId || undefined}
            aria-pressed={selectedId === objectId}
            onClick={() => onSelect(selectedId === objectId ? null : objectId)}
          >
            <Text size="sm" truncate>
              {state!.name}
            </Text>
            <Text size="xs" c="dimmed">
              ХП {state!.hitPoints.current} / {state!.hitPoints.max}
              {health && ` · ${creatureHealthLabel(health, false)}`}
              {health !== 'down' &&
                ` · Осталось ${allowanceLabel(state!.movement)}`}
            </Text>
          </UnstyledButton>
          <Tooltip label="Обновить запас: новый ход">
            <ActionIcon
              variant="subtle"
              aria-label={`Обновить запас: ${state!.name}`}
              disabled={busy}
              onClick={() => onAllowance(objectId, 'refresh')}
            >
              <IconRefresh size={16} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Рывок: ещё одна Скорость на этот ход">
            <ActionIcon
              variant="subtle"
              aria-label={`Рывок: ${state!.name}`}
              disabled={busy}
              onClick={() => onAllowance(objectId, 'dash')}
            >
              <IconRun size={16} />
            </ActionIcon>
          </Tooltip>
        </Group>
      ))}
      <Text size="xs" c="dimmed">
        {hint}
      </Text>
      {error && <Alert color="red">{error}</Alert>}
    </Stack>
  );
}

export default CreaturesPanel;
