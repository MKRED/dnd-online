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
import { sceneObjectImages, setGameSceneOpen } from '../../features/games';
import { parseCameraParams, placeCamera } from '../../features/maps/cameraView';
import type { CameraFocusApi } from '../../features/maps/MapScene';
import { errorMessage } from '../../lib/apiRequest';
import { usePageTitle } from '../../lib/usePageTitle';
import classes from './GameScenePage.module.css';
import SceneRoom from './SceneRoom';
import SceneSidebar from './SceneSidebar';
import { useGameScene } from './useGameScene';

// three.js тяжёлый — сцена грузится отдельным чанком.
const MapScene = lazy(() => import('../../features/maps/MapScene'));

// Страница сцены /games/:id/scene (docs/plan/game.md, этап 5): активная сцена игры в 3D,
// только просмотр. Игрока, которому мастер закрыл сцену, переводит в лобби.
function GameScenePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { load, setLoad, reload } = useGameScene(id);
  const game = load.kind === 'ready' || load.kind === 'none' ? load.game : null;
  const master = game?.role === 'master';
  const view = load.kind === 'ready' ? load.view : null;
  usePageTitle(view?.scene.name ?? 'Сцена');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const frame = load.kind === 'ready' ? load.frame : null;
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
  const bounds = useMemo(
    () => (load.kind === 'ready' ? mapBounds(load.state.store) : null),
    [load],
  );
  const sliderY = bounds
    ? Math.min(Math.max(cutY ?? bounds.max[1], bounds.min[1]), bounds.max[1])
    : 0;
  const sceneId = view?.scene.id ?? null;
  const handleReady = useCallback(() => setReadySceneId(sceneId), [sceneId]);

  const handleOpenChange = (open: boolean) => {
    setBusy(true);
    setError(null);
    setGameSceneOpen(id, open)
      .then((scenes) => {
        setLoad((prev) =>
          prev.kind === 'ready'
            ? {
                ...prev,
                view: {
                  ...prev.view,
                  scene: { ...prev.view.scene, open: scenes.open },
                },
              }
            : prev,
        );
      })
      .catch((err: unknown) => {
        console.error('Failed to change scene visibility', err);
        setError(
          errorMessage(
            err,
            open ? 'Не удалось открыть сцену' : 'Не удалось закрыть сцену',
          ),
        );
      })
      .finally(() => setBusy(false));
  };

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
        {load.kind === 'ready' && camera && (
          <Suspense fallback={loader}>
            <MapScene
              key={load.view.scene.id}
              map={load.state}
              refs={load.view.refs}
              cutY={cutY === null ? Number.POSITIVE_INFINITY : sliderY}
              camera={camera}
              resizePreview={null}
              editor={null}
              walk={null}
              objectTool={null}
              focusRef={focusRef}
              onReady={handleReady}
              facingMarker={
                user?.settings.facingMarker ??
                DEFAULT_USER_SETTINGS.facingMarker
              }
              objectImages={images}
              hideContainerContents={load.view.contentsHidden}
            />
          </Suspense>
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
        busy={busy}
        error={error}
        onOpenChange={handleOpenChange}
        cut={
          bounds && bounds.max[1] > bounds.min[1]
            ? { min: bounds.min[1], max: bounds.max[1], value: sliderY }
            : null
        }
        onCutChange={(y) =>
          // Ползунок на самом верху — «без среза», как в редакторе.
          setCutY(bounds && y >= bounds.max[1] ? null : y)
        }
      />
    </div>
  );
}

export default GameScenePage;
