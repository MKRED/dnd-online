import {
  Alert,
  Badge,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { Character } from 'shared';
import {
  CharactersApiError,
  deleteCharacter,
  listCharacters,
} from '../features/characters';

function CharactersPage() {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Подсветка только что созданного или изменённого персонажа — id передан через
  // navigate state со страницы создания/редактирования, чтобы было видно, какая карточка.
  // Запоминаем его в state компонента, а из истории сразу стираем (эффект ниже):
  // браузер хранит history state между перезагрузками, и бейдж иначе не пропадал бы.
  const location = useLocation();
  const navigate = useNavigate();
  const [highlight] = useState(
    () =>
      (location.state as { createdId?: string; updatedId?: string } | null) ??
      {},
  );
  const { createdId, updatedId } = highlight;
  const highlightedId = createdId ?? updatedId;

  useEffect(() => {
    if (location.state) {
      void navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    listCharacters()
      .then(setCharacters)
      .catch((err: unknown) => {
        console.error('Failed to load characters', err);
        const message =
          err instanceof CharactersApiError
            ? err.message
            : 'Не удалось загрузить персонажей';
        setError(message);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = (id: string) => {
    if (!window.confirm('Удалить персонажа безвозвратно?')) return;
    setDeletingId(id);
    deleteCharacter(id)
      .then(() => {
        setCharacters((prev) => prev.filter((c) => c.id !== id));
      })
      .catch((err: unknown) => {
        console.error('Failed to delete character', err);
        const message =
          err instanceof CharactersApiError
            ? err.message
            : 'Не удалось удалить персонажа';
        setError(message);
      })
      .finally(() => setDeletingId(null));
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>Мои персонажи</Title>
        <Button component={Link} to="/characters/new">
          Создать персонажа
        </Button>
      </Group>

      {error && (
        <Alert color="red" title="Ошибка" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader />
      ) : characters.length === 0 ? (
        <Text c="dimmed">
          У вас пока нет ни одного персонажа. Создайте первого чарника DnD 5e.
        </Text>
      ) : (
        <Stack>
          {characters.map((character) => (
            <Card
              key={character.id}
              withBorder
              radius="md"
              p="md"
              style={
                character.id === highlightedId
                  ? { borderColor: 'var(--mantine-color-green-6)' }
                  : undefined
              }
            >
              <Group justify="space-between" align="flex-start">
                <div>
                  <Group gap="xs" align="center">
                    <Text fw={600}>{character.name}</Text>
                    {character.id === highlightedId && (
                      <Badge color="green" size="sm">
                        {createdId ? 'Новый' : 'Изменён'}
                      </Badge>
                    )}
                  </Group>
                  <Text size="sm" c="dimmed">
                    {character.species} · {character.background}
                  </Text>
                  <Group gap="xs" mt={4}>
                    {character.classes.map((entry) => (
                      <Badge
                        key={`${entry.class}-${entry.level}`}
                        variant="light"
                      >
                        {entry.class} {entry.level}
                      </Badge>
                    ))}
                  </Group>
                </div>
                <Group gap="lg">
                  <Text size="sm">
                    ХП {character.hitPointsCurrent}/{character.hitPointsMax}
                  </Text>
                  <Text size="sm">КД {character.armorClass}</Text>
                  <Button
                    component={Link}
                    to={`/characters/${character.id}/edit`}
                    variant="subtle"
                    size="xs"
                  >
                    Редактировать
                  </Button>
                  <Button
                    color="red"
                    variant="subtle"
                    size="xs"
                    loading={deletingId === character.id}
                    onClick={() => handleDelete(character.id)}
                  >
                    Удалить
                  </Button>
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      )}
    </Container>
  );
}

export default CharactersPage;
