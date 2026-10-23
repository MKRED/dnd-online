import { Badge, Group, Text } from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { GameDetail, GameListItem } from 'shared';
import { SESSION_LABEL, seatsLabel } from '../../features/games';
import HomeSection from './HomeSection';
import {
  HOME_LIMITS,
  homeGameStatus,
  type HomeGameStatus,
} from './homeSummary';
import classes from './HomePage.module.css';

const STATUS: Record<HomeGameStatus, { label: string; color: string }> = {
  session: { label: SESSION_LABEL, color: 'green' },
  lobby: { label: 'Лобби', color: 'blue' },
  idle: { label: 'Встречи нет', color: 'gray' },
};

interface MyGamesCardProps {
  games: GameListItem[];
  details: GameDetail[];
  userId: string;
}

// Своя игра одной строкой: роль, места или свой персонаж, состояние. Строка ведёт в лобби.
function MyGamesCard({ games, details, userId }: MyGamesCardProps) {
  return (
    <HomeSection title="Мои игры" more={{ to: '/games', label: 'Все игры' }}>
      {games.length === 0 && (
        <Text size="sm" c="dimmed" px="md" pb="md">
          Своих игр пока нет.
        </Text>
      )}
      {games.slice(0, HOME_LIMITS.myGames).map((game) => {
        const status = STATUS[homeGameStatus(game)];
        const detail = details.find((d) => d.id === game.id);
        const mySeat = detail?.seats.find((s) => s.user.id === userId);
        const sub =
          game.role === 'master'
            ? `Мастер · ${seatsLabel(game)}`
            : `Игрок${mySeat ? ` · ${mySeat.character.name}` : ''} · мастер ${game.master.nickname}`;
        return (
          <Link key={game.id} to={`/games/${game.id}`} className={classes.row}>
            <div className={classes.rowText}>
              <Group gap={6} wrap="nowrap">
                <Text fw={600} truncate>
                  {game.name}
                </Text>
                {game.hasPassword && (
                  <IconLock
                    size={14}
                    aria-label="С паролем"
                    style={{ flexShrink: 0 }}
                  />
                )}
              </Group>
              <Text size="sm" c="dimmed" truncate>
                {sub}
              </Text>
            </div>
            <Badge
              color={status.color}
              variant="light"
              className={classes.noShrink}
            >
              {status.label}
            </Badge>
          </Link>
        );
      })}
    </HomeSection>
  );
}

export default MyGamesCard;
