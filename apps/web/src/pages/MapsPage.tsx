import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { MapInfo } from 'shared';
import { createMap, deleteMap, listMaps } from '../features/maps';
import { errorMessage } from '../lib/apiRequest';
import { usePageTitle } from '../lib/usePageTitle';

function MapsPage() {
  usePageTitle('Карты');
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    listMaps()
      .then(setMaps)
      .catch((err: unknown) => {
        console.error('Failed to load maps', err);
        setError(errorMessage(err, 'Не удалось загрузить карты'));
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    createMap(name.trim())
      .then((map) => void navigate(`/maps/${map.id}`))
      .catch((err: unknown) => {
        console.error('Failed to create map', err);
        setError(errorMessage(err, 'Не удалось создать карту'));
      })
      .finally(() => setCreating(false));
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Удалить карту безвозвратно?')) return;
    setDeletingId(id);
    deleteMap(id)
      .then(() => setMaps((prev) => prev.filter((m) => m.id !== id)))
      .catch((err: unknown) => {
        console.error('Failed to delete map', err);
        setError(errorMessage(err, 'Не удалось удалить карту'));
      })
      .finally(() => setDeletingId(null));
  };

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>Мои карты</Title>
        <Anchor component={Link} to="/tokens" size="sm">
          Токены для нейросети
        </Anchor>
      </Group>

      <form onSubmit={handleCreate}>
        <Group align="flex-end" mb="lg">
          <TextInput
            label="Новая карта"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={100}
            style={{ flex: 1 }}
          />
          <Button type="submit" loading={creating} disabled={!name.trim()}>
            Создать
          </Button>
        </Group>
      </form>

      {error && (
        <Alert color="red" title="Ошибка" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader />
      ) : maps.length === 0 ? (
        <Text c="dimmed">У вас пока нет карт.</Text>
      ) : (
        <Stack>
          {maps.map((map) => (
            <Card key={map.id} withBorder radius="md" p="md">
              <Group justify="space-between">
                <Text fw={600}>{map.name}</Text>
                <Group gap="xs">
                  <Button
                    component={Link}
                    to={`/maps/${map.id}`}
                    variant="subtle"
                    size="xs"
                  >
                    Открыть
                  </Button>
                  <Button
                    color="red"
                    variant="subtle"
                    size="xs"
                    loading={deletingId === map.id}
                    onClick={() => handleDelete(map.id)}
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

export default MapsPage;
