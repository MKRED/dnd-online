import { Loader } from '@mantine/core';
import { lazy, Suspense, useCallback, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { mapBounds } from 'shared';
import { useMapData } from '../../features/maps';
import {
  parseCameraParams,
  parseCutY,
  placeCamera,
} from '../../features/maps/cameraView';
import { EditorPanel, useMapEditor } from '../../features/maps/editor';
import { useWalkTest, WalkTestPanel } from '../../features/maps/walkTest';
import MapSidebar from './MapSidebar';
import classes from './MapViewPage.module.css';
import { usePageTitle } from '../../lib/usePageTitle';

// three.js тяжёлый — сцена грузится отдельным чанком только на этой странице.
const MapScene = lazy(() => import('../../features/maps/MapScene'));

function MapViewPage() {
  const { id = '' } = useParams();
  const { map, loadError, editError, busy, applyOps, undo, redo } =
    useMapData(id);
  usePageTitle(map?.info.name ?? 'Карта');
  const walk = useWalkTest(map?.state ?? null);
  const editor = useMapEditor({
    state: map?.state ?? null,
    applyOps,
    undo,
    redo,
    walk,
  });
  // Сцена монтируется заново только при смене карты, и первый кадр (FirstFrame)
  // приходит один раз на монтирование — поэтому готовность помним по id карты.
  const [readyMapId, setReadyMapId] = useState<string | null>(null);
  // Срез и камера живут в адресе страницы (?y=3&view=north), чтобы одна ссылка
  // всегда давала одну и ту же картинку — см. cameraView.ts.
  const [searchParams, setSearchParams] = useSearchParams();

  const bounds = useMemo(
    () => (map ? mapBounds(map.state.store) : null),
    [map],
  );

  // Зависимости — строки из адреса и кадр открытия, а не весь searchParams или
  // текущие границы: ни ползунок, ни новые блоки не должны сбрасывать камеру.
  const view = searchParams.get('view');
  const cam = searchParams.get('cam');
  const target = searchParams.get('target');
  const frame = map?.frame;
  const camera = useMemo(
    () =>
      frame
        ? placeCamera(frame, parseCameraParams({ view, cam, target }))
        : null,
    [frame, view, cam, target],
  );

  // Без ?y= видна вся карта, в том числе то, что достроят выше. Значение вне
  // границ прижимается к ним.
  const requestedY = parseCutY(searchParams);
  const sliderY = bounds
    ? Math.min(
        Math.max(requestedY ?? bounds.max[1], bounds.min[1]),
        bounds.max[1],
      )
    : 0;
  const cutY = requestedY === null ? Number.POSITIVE_INFINITY : sliderY;
  const handleCutChange = (y: number) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        // Ползунок на самом верху — «без среза»: иначе блок, поставленный
        // поверх карты, оказался бы срезан и не виден.
        if (bounds && y >= bounds.max[1]) next.delete('y');
        else next.set('y', String(y));
        return next;
      },
      { replace: true },
    );

  const handleSceneReady = useCallback(() => setReadyMapId(id), [id]);

  const loader = (
    <div className={classes.placeholder}>
      <Loader />
    </div>
  );

  return (
    <div className={classes.page}>
      <div className={classes.scene}>
        {loadError ? null : !map || !camera ? (
          loader
        ) : (
          <Suspense fallback={loader}>
            <MapScene
              key={id}
              map={map.state}
              cutY={cutY}
              camera={camera}
              frame={map.frame}
              editor={editor.sceneEditor}
              walkToken={walk.token}
              onReady={handleSceneReady}
            />
          </Suspense>
        )}
      </div>

      <MapSidebar
        name={map?.info.name ?? 'Карта'}
        loadError={loadError}
        editError={editError}
        cut={
          bounds
            ? { min: bounds.min[1], max: bounds.max[1], value: sliderY }
            : null
        }
        onCutChange={handleCutChange}
        loaded={map !== null}
        empty={map !== null && bounds === null}
        sceneReady={readyMapId === id}
      >
        <EditorPanel
          editor={editor}
          busy={busy}
          onUndo={undo}
          onRedo={redo}
          walkPanel={<WalkTestPanel walk={walk} />}
        />
      </MapSidebar>
    </div>
  );
}

export default MapViewPage;
