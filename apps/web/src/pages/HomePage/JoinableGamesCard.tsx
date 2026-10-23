import { Button, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { GameListItem } from 'shared';
import HomeSection from './HomeSection';
import { HOME_LIMITS } from './homeSummary';
import classes from './HomePage.module.css';

interface JoinableGamesCardProps {
  title: string;
  games: GameListItem[];
  // Сесть можно только игровым персонажем; без него кнопка не ведёт никуда полезного.
  hasCharacter: boolean;
}

// Чужие открытые игры со свободными местами. Персонажа выбирают в лобби, поэтому
// «Сесть» ведёт туда.
function JoinableGamesCard({
  title,
  games,
  hasCharacter,
}: JoinableGamesCardProps) {
  return (
    <HomeSection title={title} more={{ to: '/games', label: 'Все игры' }}>
      {games.length === 0 && (
        <Text size="sm" c="dimmed" px="md" pb="md">
          Открытых игр со свободными местами сейчас нет.
        </Text>
      )}
      {games.slice(0, HOME_LIMITS.joinable).map((game) => {
        const free = game.seatCount - game.takenSeats;
        return (
          <div key={game.id} className={classes.row}>
            <div className={classes.rowText}>
              <Text fw={600} truncate>
                {game.name}
              </Text>
              <Text size="sm" c="dimmed" truncate>
                мастер {game.master.nickname} · свободно мест: {free}
              </Text>
            </div>
            {hasCharacter ? (
              <Button
                component={Link}
                to={`/games/${game.id}`}
                variant="default"
                size="sm"
                className={classes.noShrink}
                aria-label={`Сесть в игру ${game.name}`}
              >
                Сесть
              </Button>
            ) : (
              <Text size="sm" c="dimmed" className={classes.noShrink}>
                Нужен персонаж
              </Text>
            )}
          </div>
        );
      })}
    </HomeSection>
  );
}

export default JoinableGamesCard;
