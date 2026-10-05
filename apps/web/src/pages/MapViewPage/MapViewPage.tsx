import { Loader, Text } from '@mantine/core';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { mapBounds, type MapInfo, type MapState } from 'shared';
import { ApiError, errorMessage } from '../../lib/apiRequest';
import {
  applyMapOps,
  DEMO_VILLAGE_OPS,
  getMap,
  getMapChunks,
  mapStateFromChunks,
} from '../../features/maps';
import {
  parseCameraParams,
  parseCutY,
  placeCamera,
} from '../../features/maps/cameraView';
import MapSidebar from './MapSidebar';
import classes from './MapViewPage.module.css';

// three.js тяжёлый — сцена грузится отдельным чанком только на этой странице.
const MapScene = lazy(() => import('../../features/maps/MapScene'));

interface LoadedMap {
  info: MapInfo;
  state: MapState;
}

function MapViewPage() {
  const { id = '' } = useParams();
  const [map, setMap] = useState<LoadedMap | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  // Срез и камера живут в адресе страницы (?y=3&view=north), чтобы одна ссылка
  // всегда давала одну и ту же картинку — см. cameraView.ts.
  const [searchParams, setSearchParams] = useSearchParams();

  const load = useCallback(
    () =>
      Promise.all([getMap(id), getMapChunks(id)])
        .then(([info, chunks]) => {
          setSceneReady(false);
          setMap({ info, state: mapStateFromChunks(chunks) });
        })
        .catch((err: unknown) => {
          console.error('Failed to load map', err);
          // Не-UUID в адресе сервер отклоняет с 400 — для пользователя это та же «не найдена».
          const notFound =
            err instanceof ApiError &&
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

  // Зависимости — строки из адреса, а не весь searchParams: движение ползунка
  // меняет только y и не должно сбрасывать камеру пользователя.
  const view = searchParams.get('view');
  const cam = searchParams.get('cam');
  const target = searchParams.get('target');
  const camera = useMemo(
    () =>
      bounds
        ? placeCamera(bounds, parseCameraParams({ view, cam, target }))
        : null,
    [bounds, view, cam, target],
  );

  // Без ?y= видна вся карта; значение вне границ прижимается к ним.
  const requestedY = parseCutY(searchParams);
  const cutY = bounds
    ? Math.min(
        Math.max(requestedY ?? bounds.max[1], bounds.min[1]),
        bounds.max[1],
      )
    : 0;
  const handleCutChange = (y: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('y', String(y));
        return next;
      },
      { replace: true },
    );

  const handleSceneReady = useCallback(() => setSceneReady(true), []);

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

  const loader = (
    <div className={classes.placeholder}>
      <Loader />
    </div>
  );

  return (
    <div className={classes.page}>
      <div className={classes.scene}>
        {error ? null : !map ? (
          loader
        ) : !bounds ? (
          <div className={classes.placeholder}>
            <Text c="dimmed">Здесь появится карта</Text>
          </div>
        ) : (
          <Suspense fallback={loader}>
            {camera && (
              <MapScene
                map={map.state}
                cutY={cutY}
                camera={camera}
                onReady={handleSceneReady}
              />
            )}
          </Suspense>
        )}
      </div>

      <MapSidebar
        name={map?.info.name ?? 'Карта'}
        error={error}
        cut={
          bounds
            ? { min: bounds.min[1], max: bounds.max[1], value: cutY }
            : null
        }
        onCutChange={handleCutChange}
        empty={map !== null && bounds === null}
        building={building}
        onBuildDemo={handleBuildDemo}
        sceneReady={sceneReady}
      />
    </div>
  );
}

export default MapViewPage;
