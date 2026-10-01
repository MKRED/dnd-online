import {
  Alert,
  Anchor,
  Button,
  Container,
  Group,
  Loader,
  Slider,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link, useParams } from 'react-router-dom';
import { mapBounds, type MapInfo, type MapState } from 'shared';
import {
  applyMapOps,
  DEMO_VILLAGE_OPS,
  getMap,
  getMapChunks,
  mapStateFromChunks,
  MapsApiError,
} from '../features/maps';

// three.js тяжёлый — сцена грузится отдельным чанком только на этой странице.
const MapScene = lazy(() => import('../features/maps/MapScene'));

interface LoadedMap {
  info: MapInfo;
  state: MapState;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof MapsApiError ? err.message : fallback;

function MapViewPage() {
  const { id = '' } = useParams();
  const [map, setMap] = useState<LoadedMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  // null — среза нет, видна вся карта.
  const [cutY, setCutY] = useState<number | null>(null);

  const load = useCallback(
    () =>
      Promise.all([getMap(id), getMapChunks(id)])
        .then(([info, chunks]) => {
          setMap({ info, state: mapStateFromChunks(chunks) });
          setCutY(null);
        })
        .catch((err: unknown) => {
          console.error('Failed to load map', err);
          // Не-UUID в адресе сервер отклоняет с 400 — для пользователя это та же «не найдена».
          const notFound =
            err instanceof MapsApiError &&
            (err.status === 404 || err.status === 400);
          setError(
            notFound
              ? 'Карта не найдена'
              : errorMessage(err, 'Не удалось загрузить карту'),
          );
        }),
    [id],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const bounds = useMemo(
    () => (map ? mapBounds(map.state.store) : null),
    [map],
  );

  // ВРЕМЕННО, до редактора мастера: заполняет пустую карту демо-постройкой.
  const handleBuildDemo = () => {
    setBuilding(true);
    applyMapOps(id, DEMO_VILLAGE_OPS)
      .then(load)
      .catch((err: unknown) => {
        console.error('Failed to build demo map', err);
        setError(errorMessage(err, 'Не удалось построить демо'));
      })
      .finally(() => setBuilding(false));
  };

  return (
    <Container size="xl" py="md">
      <Group justify="space-between" align="center" mb="sm">
        <Title order={2}>{map?.info.name ?? 'Карта'}</Title>
        <Anchor component={Link} to="/maps" size="sm">
          Все карты
        </Anchor>
      </Group>

      {error ? (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      ) : !map ? (
        <Loader />
      ) : !bounds ? (
        <Stack align="flex-start">
          <Text c="dimmed">
            Карта пустая. Редактор блоков появится позже — пока можно построить
            демо-деревню и посмотреть на неё.
          </Text>
          <Button loading={building} onClick={handleBuildDemo}>
            Построить демо-деревню
          </Button>
        </Stack>
      ) : (
        <Stack gap="xs">
          <Group gap="md" align="center">
            <Text size="sm" w="10rem">
              Срез по высоте: {cutY ?? bounds.max[1]}
            </Text>
            <Slider
              style={{ flex: 1 }}
              min={bounds.min[1]}
              max={bounds.max[1]}
              value={cutY ?? bounds.max[1]}
              onChange={setCutY}
              label={null}
              thumbLabel="Срез по высоте"
            />
          </Group>
          <Suspense fallback={<Loader />}>
            <MapScene
              map={map.state}
              bounds={bounds}
              cutY={cutY ?? bounds.max[1]}
            />
          </Suspense>
          <Text size="xs" c="dimmed">
            Левая кнопка мыши — перемещение, правая — поворот, колесо — масштаб.
          </Text>
        </Stack>
      )}
    </Container>
  );
}

export default MapViewPage;
