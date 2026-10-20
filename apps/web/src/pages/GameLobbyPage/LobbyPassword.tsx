import {
  Alert,
  Button,
  Card,
  PasswordInput,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { IconLock } from '@tabler/icons-react';
import { useState, type FormEvent } from 'react';
import type { GameDetail } from 'shared';
import { enterGame } from '../../features/games';
import { errorMessage } from '../../lib/apiRequest';

interface LobbyPasswordProps {
  gameId: string;
  onEntered: (game: GameDetail) => void;
}

// Закрытое лобби: до пароля не видно ничего. Пароль спрашивается один раз —
// дальше игрок участник и входит без него.
function LobbyPassword({ gameId, onEntered }: LobbyPasswordProps) {
  const [password, setPassword] = useState('');
  const [entering, setEntering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    setEntering(true);
    setError(null);
    enterGame(gameId, password)
      .then(onEntered)
      .catch((err: unknown) => {
        console.error('Failed to enter game', err);
        setError(errorMessage(err, 'Не удалось войти в игру'));
        setEntering(false);
      });
  };

  return (
    <Card withBorder radius="md" p="lg" maw={420} mx="auto">
      <form onSubmit={handleSubmit}>
        <Stack>
          <Title order={2} size="h3">
            <IconLock size={20} style={{ verticalAlign: 'middle' }} /> Игра
            закрыта паролем
          </Title>
          <Text size="sm" c="dimmed">
            Пароль даёт мастер. Ввести его нужно один раз — дальше лобби
            открывается сразу.
          </Text>
          <PasswordInput
            label="Пароль игры"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            autoComplete="off"
            data-autofocus
            autoFocus
          />
          {error && <Alert color="red">{error}</Alert>}
          <Button type="submit" loading={entering} disabled={!password}>
            Войти в лобби
          </Button>
        </Stack>
      </form>
    </Card>
  );
}

export default LobbyPassword;
