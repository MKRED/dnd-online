import { Badge, Button, Card, Group, Stack, Switch, Text } from '@mantine/core';
import type { GameSeat } from 'shared';
import { CLASS_LABELS, SPECIES_LABELS } from '../../features/characters';
import OnlineDot from './OnlineDot';

interface SeatCardProps {
  seat: GameSeat;
  // Место смотрящего: переключатель разрешения и «Освободить место».
  own: boolean;
  // Смотрящий — мастер: может убрать игрока.
  master: boolean;
  // Игрок сейчас в лобби (по сокету).
  online: boolean;
  busy: boolean;
  onToggleHandover: (allow: boolean) => void;
  onFree: () => void;
  onRemove: () => void;
}

// Занятое место в лобби: персонаж (имя, вид, классы) и игрок за ним.
function SeatCard({
  seat,
  own,
  master,
  online,
  busy,
  onToggleHandover,
  onFree,
  onRemove,
}: SeatCardProps) {
  const { character } = seat;
  return (
    <Card withBorder radius="md" p="md">
      <Stack gap={6} h="100%">
        <Group justify="space-between" wrap="nowrap" align="flex-start">
          <Text fw={600} truncate>
            {character.name}
          </Text>
          {own && (
            <Badge variant="light" style={{ flexShrink: 0 }}>
              Вы
            </Badge>
          )}
        </Group>
        <Text size="sm" c="dimmed">
          {SPECIES_LABELS[character.species]} ·{' '}
          {character.classes
            .map((entry) => `${CLASS_LABELS[entry.class]} ${entry.level}`)
            .join(', ')}
        </Text>
        <Group gap={6} wrap="nowrap">
          <OnlineDot online={online} />
          <Text size="sm" truncate>
            Игрок: {seat.user.nickname}
          </Text>
        </Group>
        {own ? (
          <Switch
            size="sm"
            label="Можно передать управление"
            checked={seat.allowHandover}
            disabled={busy}
            onChange={(e) => onToggleHandover(e.currentTarget.checked)}
          />
        ) : (
          <Text size="xs" c="dimmed">
            {seat.allowHandover
              ? 'Управление можно передать другому игроку'
              : 'Управление не передаётся'}
          </Text>
        )}
        {(own || master) && (
          <Group justify="flex-end" mt="auto">
            {own && (
              <Button
                variant="subtle"
                size="xs"
                disabled={busy}
                onClick={onFree}
              >
                Освободить место
              </Button>
            )}
            {master && (
              <Button
                variant="subtle"
                color="red"
                size="xs"
                disabled={busy}
                onClick={onRemove}
              >
                Убрать из игры
              </Button>
            )}
          </Group>
        )}
      </Stack>
    </Card>
  );
}

export default SeatCard;
