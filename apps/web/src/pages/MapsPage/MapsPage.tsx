import {
  Alert,
  Container,
  Group,
  Loader,
  SegmentedControl,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import type { MapListItem } from 'shared';
import { useCollectionView } from '../../features/catalog';
import { deleteMap, listMaps, renameMap } from '../../features/maps';
import { errorMessage } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import MapCard from './MapCard';
import NewMapForm from './NewMapForm';

function MapsPage() {
  usePageTitle('Карты');
  const [maps, setMaps] = useState<MapListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  // Карта, у которой открыто поле имени; одно поле за раз.
  const [renamingId, setRenamingId] = useState<string | null>(null);
  // Свой ключ: вид карт не обязан совпадать с видом справочника.
  const [view, setView] = useCollectionView('maps.view', 'list');

  useEffect(() => {
    listMaps()
      .then(setMaps)
      .catch((err: unknown) => {
        console.error('Failed to load maps', err);
        setError(errorMessage(err, 'Не удалось загрузить карты'));
      })
      .finally(() => setLoading(false));
  }, []);

  // Имя и дату правки — из ответа: переименование тоже считается изменением карты.
  const handleRename = (id: string, next: string) =>
    renameMap(id, next).then((info) =>
      setMaps((prev) =>
        prev.map((m) =>
          m.id === id
            ? { ...m, name: info.name, updatedAt: info.updatedAt }
            : m,
        ),
      ),
    );

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

  const cards = maps.map((map) => (
    <MapCard
      key={map.id}
      map={map}
      view={view}
      renaming={renamingId === map.id}
      deleting={deletingId === map.id}
      onStartRename={() => setRenamingId(map.id)}
      onStopRename={() => setRenamingId(null)}
      onRename={(next) => handleRename(map.id, next)}
      onDelete={() => handleDelete(map.id)}
    />
  ));

  return (
    <Container size="md" py="xl">
      <Group justify="space-between" align="center" mb="lg">
        <Title order={1}>Мои карты</Title>
        {maps.length > 0 && (
          <SegmentedControl
            aria-label="Вид"
            size="xs"
            value={view}
            onChange={(value) => setView(value === 'grid' ? 'grid' : 'list')}
            data={[
              { value: 'list', label: 'Список' },
              { value: 'grid', label: 'Плитки' },
            ]}
          />
        )}
      </Group>

      <NewMapForm />

      {error && (
        <Alert color="red" title="Ошибка" mb="md">
          {error}
        </Alert>
      )}

      {loading ? (
        <Loader />
      ) : maps.length === 0 ? (
        <Text c="dimmed">У вас пока нет карт.</Text>
      ) : view === 'grid' ? (
        <SimpleGrid cols={{ base: 1, xs: 2, sm: 3 }} spacing="sm">
          {cards}
        </SimpleGrid>
      ) : (
        <Stack gap="xs">{cards}</Stack>
      )}
    </Container>
  );
}

export default MapsPage;
