import {
  Alert,
  Button,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Stack,
  TextInput,
} from '@mantine/core';
import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DEFAULT_GAME_SEATS,
  GAME_NAME_MAX,
  GAME_PASSWORD_MAX,
  GAME_SEATS_MAX,
  GAME_SEATS_MIN,
} from 'shared';
import { createGame } from './gamesApi';
import { errorMessage } from '../../lib/apiRequest';

interface CreateGameModalProps {
  opened: boolean;
  onClose: () => void;
}

// Новая игра: название, число мест и пароль. После создания мастер сразу попадает в лобби.
function CreateGameModal({ opened, onClose }: CreateGameModalProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  // Пока поле набирается, там строка — игру с ней не создаём.
  const [seats, setSeats] = useState<number | string>(DEFAULT_GAME_SEATS);
  const [password, setPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seatsValid =
    typeof seats === 'number' &&
    Number.isInteger(seats) &&
    seats >= GAME_SEATS_MIN &&
    seats <= GAME_SEATS_MAX;
  const valid = name.trim() !== '' && seatsValid;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    setCreating(true);
    setError(null);
    createGame({
      name: name.trim(),
      seatCount: Number(seats),
      password: password || undefined,
    })
      .then((game) => void navigate(`/games/${game.id}`))
      .catch((err: unknown) => {
        console.error('Failed to create game', err);
        setError(errorMessage(err, 'Не удалось создать игру'));
        setCreating(false);
      });
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Новая игра" centered>
      <form onSubmit={handleSubmit}>
        <Stack>
          <TextInput
            label="Название"
            placeholder="Подземелье Бездны"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={GAME_NAME_MAX}
            required
            data-autofocus
          />
          <NumberInput
            label="Мест для игроков"
            description="Сколько персонажей в партии; мастер места не занимает"
            value={seats}
            onChange={setSeats}
            min={GAME_SEATS_MIN}
            max={GAME_SEATS_MAX}
            allowDecimal={false}
            error={
              seatsValid ? null : `От ${GAME_SEATS_MIN} до ${GAME_SEATS_MAX}`
            }
          />
          <PasswordInput
            label="Пароль"
            description="Пусто — игра открытая. С паролем в лобби пускает только он"
            value={password}
            onChange={(e) => setPassword(e.currentTarget.value)}
            maxLength={GAME_PASSWORD_MAX}
            autoComplete="new-password"
          />
          {error && <Alert color="red">{error}</Alert>}
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Отмена
            </Button>
            <Button type="submit" loading={creating} disabled={!valid}>
              Создать
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
}

export default CreateGameModal;
