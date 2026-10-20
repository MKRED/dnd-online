import { Alert, Anchor, Loader, Text, VisuallyHidden } from '@mantine/core';
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { DEFAULT_USER_SETTINGS, mapBounds } from 'shared';
import { useAuth } from '../../features/auth';
import { sceneObjectImages } from '../../features/games';
import { parseCameraParams, placeCamera } from '../../features/maps/cameraView';
import { SceneToolbar } from '../../features/maps/editor';
import type { CameraFocusApi } from '../../features/maps/MapScene';
import { usePageTitle } from '../../lib/usePageTitle';
import classes from './GameScenePage.module.css';
import SceneRoom from './SceneRoom';
import SceneSidebar from './SceneSidebar';
import SceneToolsPanel from './SceneToolsPanel';
import { useGameScene } from './useGameScene';
import { useSceneFigures } from './useSceneFigures';
import { useSceneOpen } from './useSceneOpen';
import { SCENE_TOOLS, useSceneTools } from './useSceneTools';

// three.js тяжёлый — сцена грузится отдельным чанком.
const MapScene = lazy(() => import('../../features/maps/MapScene'));

// Страница сцены /games/:id/scene (docs/plan/game.md, этапы 5 и 6): активная сцена игры в
// 3D. Мастер правит её инструментами редактора карты, игроки видят каждую правку сразу.
// Игрока, которому мастер закрыл сцену, переводит в лобби.
function GameScenePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { load, setLoad, reload, edits, receiveEdit } = useGameScene(id);
  const game = load.kind === 'ready' || load.kind === 'none' ? load.game : null;
  const master = game?.role === 'master';
  const ready = load.kind === 'ready' ? load : null;
  const view = ready?.view ?? null;
  usePageTitle(view?.scene.name ?? 'Сцена');
  const open = useSceneOpen(id, setLoad);
  const { editor, objects } = useSceneTools({
    master,
    state: ready?.state ?? null,
    refs: view?.refs ?? null,
    edits,
  });
  const [readySceneId, setReadySceneId] = useState<string | null>(null);
  const [cutY, setCutY] = useState<number | null>(null);
  const focusRef = useRef<CameraFocusApi | null>(null);
  const [searchParams] = useSearchParams();
  // Один объект путей на игру: новый перестраивал бы объекты сцены.
  const images = useMemo(() => sceneObjectImages(id), [id]);
  const lobby = `/games/${id}`;

  useEffect(() => {
    if (load.kind === 'away') void navigate(lobby, { replace: true });
  }, [load.kind, lobby, navigate]);

  const frame = ready?.frame ?? null;
  const viewParam = searchParams.get('view');
  const cam = searchParams.get('cam');
  const target = searchParams.get('target');
  const camera = useMemo(
    () =>
      frame
        ? placeCamera(
            frame,
            parseCameraParams({ view: viewParam, cam, target }),
          )
        : null,
    [frame, viewParam, cam, target],
  );
  const state = ready?.state ?? null;
  const bounds = useMemo(
    () => (state ? mapBounds(state.store) : null),
    [state],
  );
  const sliderY = bounds
    ? Math.min(Math.max(cutY ?? bounds.max[1], bounds.min[1]), bounds.max[1])
    : 0;
  const sceneId = view?.scene.id ?? null;
  const figures = useSceneFigures(id, sceneId);
  const handleReady = useCallback(() => setReadySceneId(sceneId), [sceneId]);
  const tools = master && ready !== null;

  const loader = (
    <div className={classes.placeholder}>
      <Loader />
    </div>
  );

  return (
    <div className={classes.page}>
      {game && (
        <SceneRoom
          gameId={id}
          since={game.eventSeq}
          master={master}
          onReload={reload}
          onSceneEdit={receiveEdit}
          onFigures={figures.reload}
          onLeave={() => void navigate(lobby)}
        />
      )}
      <div className={classes.scene}>
        {load.kind === 'error' && (
          <div className={classes.placeholder}>
            <Alert color="red">{load.message}</Alert>
          </div>
        )}
        {load.kind === 'none' && (
          <div className={classes.placeholder}>
            <Text c="dimmed">
              В игре нет активной сцены.{' '}
              <Anchor component={Link} to={lobby}>
                Вернуться в лобби
              </Anchor>
            </Text>
          </div>
        )}
        {(load.kind === 'loading' || load.kind === 'away') && loader}
        {ready && camera && (
          <Suspense fallback={loader}>
            <MapScene
              key={ready.view.scene.id}
              map={ready.state}
              refs={ready.view.refs}
              cutY={cutY === null ? Number.POSITIVE_INFINITY : sliderY}
              camera={camera}
              resizePreview={null}
              editor={tools ? editor.sceneEditor : null}
              walk={null}
              objectTool={
                tools && editor.tool === 'objects' ? objects.scene : null
              }
              focusRef={focusRef}
              onReady={handleReady}
              facingMarker={
                user?.settings.facingMarker ??
                DEFAULT_USER_SETTINGS.facingMarker
              }
              objectImages={images}
              hideContainerContents={ready.view.contentsHidden}
              figures={figures.inputs}
            />
          </Suspense>
        )}
        {tools && (
          <SceneToolbar
            tools={SCENE_TOOLS}
            tool={editor.tool}
            onTool={editor.setTool}
            busy={edits.busy}
            onUndo={edits.undo}
            onRedo={edits.redo}
          />
        )}
        {/* Готовность сцены не видна глазу: её ждёт агент в браузере перед снимком,
            а скринридер читает её как статус. */}
        {view && (
          <VisuallyHidden role="status">
            {readySceneId === view.scene.id
              ? 'Сцена готова'
              : 'Загрузка сцены…'}
          </VisuallyHidden>
        )}
      </div>
      <SceneSidebar
        gameId={id}
        gameName={game?.name ?? ''}
        scene={view?.scene ?? null}
        master={master}
        busy={open.busy}
        error={open.error}
        onOpenChange={open.setOpen}
        cut={
          bounds && bounds.max[1] > bounds.min[1]
            ? { min: bounds.min[1], max: bounds.max[1], value: sliderY }
            : null
        }
        onCutChange={(y) =>
          // Ползунок на самом верху — «без среза», как в редакторе.
          setCutY(bounds && y >= bounds.max[1] ? null : y)
        }
      >
        {tools && (
          <SceneToolsPanel
            editor={editor}
            objects={objects}
            state={ready.state}
            refs={ready.view.refs}
            busy={edits.busy}
            editError={edits.editError}
            onFocus={(point) => focusRef.current?.focusOn(point)}
          />
        )}
      </SceneSidebar>
    </div>
  );
}

export default GameScenePage;
