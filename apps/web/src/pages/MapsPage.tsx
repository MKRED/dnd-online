import {
  Alert,
  Anchor,
  Button,
  Card,
  Container,
  Group,
  Loader,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  DEFAULT_MAP_LIMITS,
  DEFAULT_MAP_SIZE,
  sizeLabel,
  type MapInfo,
} from 'shared';
import { createMap, deleteMap, listMaps, mapSizeLabel } from '../features/maps';
import { errorMessage } from '../lib/apiRequest';
import { usePageTitle } from '../lib/usePageTitle';

function MapsPage() {
  usePageTitle('Карты');
  const navigate = useNavigate();
  const [maps, setMaps] = useState<MapInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  // Пока поле пустое или набирается, там строка — карту с ней не создаём.
  const [width, setWidth] = useState<number | string>(DEFAULT_MAP_SIZE.width);
  const [depth, setDepth] = useState<number | string>(DEFAULT_MAP_SIZE.depth);
  const validSide = (value: number | string) =>
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= DEFAULT_MAP_LIMITS.maxSize;
  const sizeValid = validSide(width) && validSide(depth);
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
    if (!name.trim() || !sizeValid) return;
    setCreating(true);
    setError(null);
    createMap(name.trim(), { width: Number(width), depth: Number(depth) })
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
        <Group align="flex-end" mb={4}>
          <TextInput
            label="Новая карта"
            placeholder="Название"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            maxLength={100}
            style={{ flex: '1 1 12rem' }}
          />
          <NumberInput
            label="Ширина"
            value={width}
            onChange={setWidth}
            min={1}
            max={DEFAULT_MAP_LIMITS.maxSize}
            allowDecimal={false}
            w="6rem"
          />
          <NumberInput
            label="Глубина"
            value={depth}
            onChange={setDepth}
            min={1}
            max={DEFAULT_MAP_LIMITS.maxSize}
            allowDecimal={false}
            w="6rem"
          />
          <Button
            type="submit"
            loading={creating}
            disabled={!name.trim() || !sizeValid}
          >
            Создать
          </Button>
        </Group>
        <Text size="xs" c="dimmed" mb="lg">
          {sizeValid
            ? `Карта ${mapSizeLabel({ width: Number(width), depth: Number(depth) })}; клетка — 5 футов. Размер можно поменять потом.`
            : `Ширина и глубина — от 1 до ${DEFAULT_MAP_LIMITS.maxSize} клеток.`}
        </Text>
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
                <Group gap="xs" align="baseline">
                  <Text fw={600}>{map.name}</Text>
                  <Text size="sm" c="dimmed">
                    {sizeLabel(map)}
                  </Text>
                </Group>
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
