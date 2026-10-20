import { Badge, Card, Group, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { GameListItem } from 'shared';
import { ROLE_LABELS, SESSION_LABEL, seatsLabel } from '../../features/games';

// Строка общего списка игр; вся карточка ведёт в лобби.
function GameCard({ game }: { game: GameListItem }) {
  const full = game.takenSeats >= game.seatCount;
  return (
    <Card
      component={Link}
      to={`/games/${game.id}`}
      withBorder
      radius="md"
      p="md"
      aria-label={`Открыть игру ${game.name}`}
    >
      <Group justify="space-between" wrap="nowrap" align="flex-start">
        <Group gap={6} wrap="nowrap" miw={0}>
          <Text fw={600} truncate>
            {game.name}
          </Text>
          {game.hasPassword && (
            <IconLock
              size={16}
              aria-label="С паролем"
              style={{ flexShrink: 0 }}
            />
          )}
        </Group>
        {game.role && (
          <Badge variant="light" style={{ flexShrink: 0 }}>
            {ROLE_LABELS[game.role]}
          </Badge>
        )}
      </Group>
      <Text size="sm" c="dimmed">
        Мастер: {game.master.nickname} ·{' '}
        <Text span inherit c={full ? 'orange' : undefined}>
          {seatsLabel(game)}
        </Text>
      </Text>
      {/* Отдельной строкой: рядом с названием на телефоне не хватало места. */}
      {game.sessionStartedAt && (
        <Badge color="green" variant="light" mt={6}>
          {SESSION_LABEL}
        </Badge>
      )}
    </Card>
  );
}

export default GameCard;
