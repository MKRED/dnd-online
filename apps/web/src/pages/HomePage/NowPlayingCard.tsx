import { Avatar, Badge, Button, Card, Group, Text, Title } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { GameDetail, GameListItem } from 'shared';
import { ROLE_LABELS, SESSION_LABEL, seatsLabel } from '../../features/games';
import { sessionDuration } from './homeSummary';
import classes from './HomePage.module.css';

interface NowPlayingCardProps {
  game: GameListItem;
  // Подробности могли не загрузиться — тогда без сцены и мест.
  detail: GameDetail | undefined;
  now: Date;
}

// Идущая встреча в своей игре: главная кнопка — «На сцену». Сцену игроку видно, только
// когда мастер её открыл (detail.scene приходит null), — тогда остаётся только лобби.
function NowPlayingCard({ game, detail, now }: NowPlayingCardProps) {
  const scene = detail?.scene ?? null;
  return (
    <Card withBorder radius="lg" p="lg" className={classes.nowCard}>
      <Group justify="space-between" align="center" gap="md">
        <div style={{ minWidth: 0 }}>
          <Group gap={6} mb={8}>
            <Badge color="green" variant="light">
              {SESSION_LABEL} · {sessionDuration(game.sessionStartedAt!, now)}
            </Badge>
            {game.role && (
              <Badge variant="light">{ROLE_LABELS[game.role]}</Badge>
            )}
          </Group>
          <Title order={2} fz={{ base: 20, sm: 24 }}>
            {game.name}
          </Title>
          <Text size="sm" c="dimmed" mt={4}>
            {scene
              ? `Сцена «${scene.name}» · ${scene.open ? 'открыта игрокам' : 'закрыта от игроков'}`
              : game.role === 'master'
                ? 'Сцена не выбрана'
                : 'Мастер ещё не открыл сцену'}
          </Text>
          {detail && (
            <Group gap="xs" mt="sm" wrap="nowrap">
              {detail.seats.length > 0 && (
                <Avatar.Group spacing="sm">
                  {detail.seats.map((seat) => (
                    <Avatar
                      key={seat.character.id}
                      name={seat.character.name}
                      color="initials"
                      size="sm"
                      title={`${seat.character.name} (${seat.user.nickname})`}
                    />
                  ))}
                </Avatar.Group>
              )}
              <Text size="sm" c="dimmed">
                {seatsLabel(game)}
              </Text>
            </Group>
          )}
        </div>
        <Group gap="xs" className={classes.nowActions}>
          {scene && (
            <Button
              component={Link}
              to={`/games/${game.id}/scene`}
              size="md"
              className={classes.grow}
            >
              На сцену
            </Button>
          )}
          <Button
            component={Link}
            to={`/games/${game.id}`}
            variant="default"
            size="md"
          >
            Лобби
          </Button>
        </Group>
      </Group>
    </Card>
  );
}

export default NowPlayingCard;
