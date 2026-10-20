import {
  Alert,
  Anchor,
  Button,
  Checkbox,
  Group,
  Loader,
  Modal,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Character, GameDetail } from 'shared';
import { listCharacters } from '../../features/characters';
import { takeSeat } from '../../features/games';
import { errorMessage } from '../../lib/apiRequest';

interface TakeSeatModalProps {
  gameId: string;
  opened: boolean;
  onClose: () => void;
  onSeated: (game: GameDetail) => void;
}

// Занять место: свой игровой персонаж и разрешение отдать управление им другому игроку,
// когда вас нет. Персонаж, который уже в другой игре, сервер не пустит (409 с её названием).
function TakeSeatModal({
  gameId,
  opened,
  onClose,
  onSeated,
}: TakeSeatModalProps) {
  const [characters, setCharacters] = useState<Character[] | null>(null);
  const [characterId, setCharacterId] = useState<string | null>(null);
  const [allowHandover, setAllowHandover] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!opened || characters) return;
    listCharacters()
      .then((list) => {
        const pcs = list.filter((c) => c.kind === 'pc');
        setCharacters(pcs);
        if (pcs.length === 1) setCharacterId(pcs[0].id);
      })
      .catch((err: unknown) => {
        console.error('Failed to load characters', err);
        setError(errorMessage(err, 'Не удалось загрузить персонажей'));
      });
  }, [opened, characters]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!characterId) return;
    setSaving(true);
    setError(null);
    takeSeat(gameId, characterId, allowHandover)
      .then((game) => {
        onSeated(game);
        onClose();
      })
      .catch((err: unknown) => {
        console.error('Failed to take seat', err);
        setError(errorMessage(err, 'Не удалось занять место'));
      })
      .finally(() => setSaving(false));
  };

  return (
    <Modal opened={opened} onClose={onClose} title="Занять место" centered>
      {characters === null && !error ? (
        <Loader />
      ) : characters?.length === 0 ? (
        <Text>
          У вас нет игровых персонажей.{' '}
          <Anchor component={Link} to="/characters/new">
            Создать персонажа
          </Anchor>
        </Text>
      ) : (
        <form onSubmit={handleSubmit}>
          <Stack>
            <Select
              label="Персонаж"
              placeholder="Выберите персонажа"
              data={(characters ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={characterId}
              onChange={setCharacterId}
              allowDeselect={false}
              comboboxProps={{ withinPortal: true }}
            />
            <Checkbox
              label="Можно передать управление другому игроку"
              description="Если вас не будет на встрече, мастер отдаст персонажа тому, кто играет"
              checked={allowHandover}
              onChange={(e) => setAllowHandover(e.currentTarget.checked)}
            />
            {error && <Alert color="red">{error}</Alert>}
            <Group justify="flex-end">
              <Button variant="default" onClick={onClose}>
                Отмена
              </Button>
              <Button type="submit" loading={saving} disabled={!characterId}>
                Занять
              </Button>
            </Group>
          </Stack>
        </form>
      )}
    </Modal>
  );
}

export default TakeSeatModal;
