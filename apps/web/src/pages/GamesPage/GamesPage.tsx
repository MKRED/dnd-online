import {
  Alert,
  Button,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import type { GameListItem } from 'shared';
import { listGames } from '../../features/games';
import { errorMessage } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import CreateGameModal from './CreateGameModal';
import GameCard from './GameCard';

// Общий список игр (docs/plan/done/game.md): свои сверху, закрытые — с замком.
function GamesPage() {
  usePageTitle('Игры');
  const [games, setGames] = useState<GameListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    listGames()
      .then(setGames)
      .catch((err: unknown) => {
        console.error('Failed to load games', err);
        setError(errorMessage(err, 'Не удалось загрузить игры'));
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" mb="lg">
        <Title order={1}>Игры</Title>
        <Button
          leftSection={<IconPlus size={16} />}
          onClick={() => setCreating(true)}
        >
          Создать игру
        </Button>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader />
      ) : games.length === 0 ? (
        <Text c="dimmed">
          Игр пока нет. Создайте первую — вы будете в ней мастером.
        </Text>
      ) : (
        <Stack>
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </Stack>
      )}

      <CreateGameModal opened={creating} onClose={() => setCreating(false)} />
    </Container>
  );
}

export default GamesPage;
