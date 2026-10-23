import { Loader, VisuallyHidden } from '@mantine/core';
import { lazy, Suspense, useCallback, useMemo, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { DEFAULT_USER_SETTINGS, mapBounds } from 'shared';
import { useAuth } from '../../features/auth';
import { useMapData, useRulesState } from '../../features/maps';
import {
  EMPTY_DRAFT,
  MapSizePanel,
  type ResizeDraft,
} from '../../features/maps/resize';
import {
  parseCameraParams,
  parseCutY,
  placeCamera,
} from '../../features/maps/cameraView';
import {
  EditorPanel,
  ObjectsPanel,
  SceneToolbar,
  TOOL_LABELS,
  useMapEditor,
  useObjectTool,
} from '../../features/maps/editor';
import type { CameraFocusApi } from '../../features/maps/MapScene';
import { useWalkTest, WalkTestPanel } from '../../features/maps/walkTest';
import CutRuler from '../../features/maps/CutRuler';
import MapSidebar from './MapSidebar';
import classes from './MapViewPage.module.css';
import { usePageTitle } from '../../lib/usePageTitle';

// three.js тяжёлый — сцена грузится отдельным чанком только на этой странице.
const MapScene = lazy(() => import('../../features/maps/MapScene'));

function MapViewPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const { map, loadError, editError, busy, applyOps, editOps, undo, redo } =
    useMapData(id);
  usePageTitle(map?.info.name ?? 'Карта');
  // Карта для правил «Хода» и фигурок — с клетками обстановки.
  const rules = useRulesState(map?.state ?? null, map?.refs ?? null);
  const walk = useWalkTest(rules.state);
  const objects = useObjectTool({
    state: map?.state ?? null,
    refs: map?.refs ?? null,
    applyOps,
  });
  // Центр камеры: страница переносит его к объекту из списка «На карте».
  const focusRef = useRef<CameraFocusApi | null>(null);
  // Открытая панель «Размер карты» с набранным изменением; null — панель закрыта.
  const [sizeDraft, setSizeDraft] = useState<ResizeDraft | null>(null);
  const editor = useMapEditor({
    state: map?.state ?? null,
    applyOps,
    undo,
    redo,
    walk,
    objects,
    keysActive: sizeDraft === null,
  });
  // Сцена монтируется заново только при смене карты, и готовность (первый кадр с
  // картинками объектов, FirstFrame) приходит один раз на монтирование — поэтому
  // помним её по id карты.
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
  // Пока открыта панель размера, клики по сцене ничего не правят: на сцене — новая
  // граница, а инструмент спрятан вместе со своей панелью.
  const resizePreview =
    sizeDraft && Object.values(sizeDraft.grow).some((v) => v !== 0)
      ? sizeDraft.grow
      : null;

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
              map={rules.state ?? map.state}
              refs={map.refs}
              cutY={cutY}
              camera={camera}
              resizePreview={resizePreview}
              editor={sizeDraft ? null : editor.sceneEditor}
              walk={walk.scene}
              objectTool={
                !sizeDraft && editor.tool === 'place' ? objects.scene : null
              }
              focusRef={focusRef}
              onReady={handleSceneReady}
              settings={user?.settings ?? DEFAULT_USER_SETTINGS}
            />
          </Suspense>
        )}
        {/* Пока открыта панель размера, инструменты спрятаны: сцена ничего не правит. */}
        {map && !sizeDraft && (
          <SceneToolbar
            tool={editor.tool}
            onTool={editor.setTool}
            busy={busy}
            onUndo={undo}
            onRedo={redo}
          />
        )}
        {/* Срез — когда есть что срезать: блоки больше чем на одном уровне. */}
        {map && bounds && bounds.max[1] > bounds.min[1] && (
          <CutRuler
            min={bounds.min[1]}
            max={bounds.max[1]}
            value={sliderY}
            onChange={handleCutChange}
          />
        )}
        {/* Готовность сцены не видна глазу, но её ждёт агент в браузере перед снимком
            (docs/mcp.md), а скринридер читает её как статус. */}
        {map && (
          <VisuallyHidden role="status">
            {readyMapId === id ? 'Сцена готова' : 'Загрузка сцены…'}
          </VisuallyHidden>
        )}
      </div>

      <MapSidebar
        name={map?.info.name ?? 'Карта'}
        size={map?.state.size ?? null}
        onEditSize={sizeDraft ? null : () => setSizeDraft(EMPTY_DRAFT)}
        showInfo={editor.tool === 'view'}
        panelTitle={sizeDraft ? 'Размер карты' : TOOL_LABELS[editor.tool]}
        loadError={loadError}
        editError={editError}
        loaded={map !== null}
        empty={map !== null && bounds === null}
      >
        {map && sizeDraft ? (
          <MapSizePanel
            state={map.state}
            refs={map.refs}
            draft={sizeDraft}
            onChange={setSizeDraft}
            onApply={(op) =>
              void editOps([op]).then((applied) => {
                if (applied) setSizeDraft(null);
              })
            }
            onCancel={() => setSizeDraft(null)}
            busy={busy}
          />
        ) : (
          <EditorPanel
            editor={editor}
            walkPanel={<WalkTestPanel walk={walk} />}
            objectChoice={objects.settings.choice}
            objectsPanel={
              map && (
                <ObjectsPanel
                  tool={objects}
                  state={map.state}
                  refs={map.refs}
                  busy={busy}
                  onFocus={(point) => focusRef.current?.focusOn(point)}
                />
              )
            }
          />
        )}
      </MapSidebar>
    </div>
  );
}

export default MapViewPage;
