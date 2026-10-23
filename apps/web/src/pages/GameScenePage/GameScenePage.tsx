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
import {
  DEFAULT_USER_SETTINGS,
  mapBounds,
  type GameSceneEditMessage,
} from 'shared';
import { useAuth } from '../../features/auth';
import { sceneObjectImages } from '../../features/games';
import { parseCameraParams, placeCamera } from '../../features/maps/cameraView';
import { useFogMasks } from '../../features/maps/fogMasks';
import { useRulesState } from '../../features/maps/useRulesState';
import CutRuler from '../../features/maps/CutRuler';
import { SceneToolbar } from '../../features/maps/editor';
import type { CameraFocusApi } from '../../features/maps/MapScene';
import { usePageTitle } from '../../lib/usePageTitle';
import classes from './GameScenePage.module.css';
import SceneRoom from './SceneRoom';
import SceneSidebar from './SceneSidebar';
import SceneToolsPanel from './SceneToolsPanel';
import { useGameScene } from './useGameScene';
import { CreatureCards, useCreatureCards } from './creatures';
import { FiguresPanel, useScenePlay } from './figures';
import { FogPanel, playersView, useSceneFog } from './fog';
import { SceneModeSwitch, useSceneMode } from './mode';
import { useSceneOpen } from './useSceneOpen';
import { SCENE_TOOLS, useSceneTools } from './useSceneTools';

// three.js тяжёлый — сцена грузится отдельным чанком.
const MapScene = lazy(() => import('../../features/maps/MapScene'));

// Страница сцены /games/:id/scene (docs/plan/done/game.md, этапы 5–8): активная сцена игры в
// 3D. Мастер правит её инструментами редактора карты, игроки видят каждую правку сразу.
// Игрока, которому мастер закрыл сцену, переводит в лобби.
function GameScenePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { load, setLoad, reload, edits, receiveEdit, receiveFog } =
    useGameScene(id);
  const game = load.kind === 'ready' || load.kind === 'none' ? load.game : null;
  const master = game?.role === 'master';
  const ready = load.kind === 'ready' ? load : null;
  const view = ready?.view ?? null;
  // Туман войны игрока: что видно сейчас и что открыто (у мастера тумана нет).
  const playerFog = useFogMasks(view?.fog ?? null);
  // Мастеру: настройки тумана и «Глазами игроков» — маски игроков поверх его сцены.
  const sceneFog = useSceneFog(id, view?.scene ?? null, master, setLoad);
  const eyesFog = useFogMasks(sceneFog.masks);
  const fog = eyesFog ?? playerFog;
  usePageTitle(view?.scene.name ?? 'Сцена');
  const open = useSceneOpen(id, setLoad);
  // «Глазами игроков» — только просмотр: ни инструментов, ни ходов, ни выбора.
  const viewOnly = sceneFog.eyes;
  // Режим мастера (docs/plan/scene-page.md): в «Игре» нет инструментов редактора, в
  // «Правке» — есть, а фигурки и существа переставляются без хода.
  const { mode, setMode } = useSceneMode(master, ready !== null && !viewOnly);
  const editing = master && mode === 'edit';
  const { editor, objects } = useSceneTools({
    master,
    editing,
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
  // Карта для правил хода и фигурок — с клетками обстановки (этап 8в2 плана блоков).
  const rules = useRulesState(ready?.state ?? null, view?.refs ?? null);
  const state = rules.state;
  const bounds = useMemo(
    () => (state ? mapBounds(state.store) : null),
    [state],
  );
  const sliderY = bounds
    ? Math.min(Math.max(cutY ?? bounds.max[1], bounds.min[1]), bounds.max[1])
    : 0;
  const sceneId = view?.scene.id ?? null;
  const play = useScenePlay({
    gameId: id,
    sceneId,
    // В «Правке» фигурку выбирают только в «Просмотре»: другие инструменты правят карту.
    active: !editing || editor.tool === 'view',
    free: editing,
    state,
    refs: view?.refs ?? null,
  });
  const { figures } = play;
  const { select: selectFigure } = play.tool;
  const clearFigure = useCallback(() => selectFigure(null), [selectFigure]);
  const cards = useCreatureCards({
    gameId: id,
    sceneId,
    master,
    state,
    refs: view?.refs ?? null,
    figures: figures.figures,
    canPick: master && !editing,
    figureId: play.tool.selectedId,
    clearFigure,
    reloadFigures: figures.reload,
  });
  const { onSceneEdit: creaturesSceneEdit } = cards;
  const sceneEdit = useCallback(
    (message: GameSceneEditMessage) => {
      receiveEdit(message);
      creaturesSceneEdit(message);
    },
    [receiveEdit, creaturesSceneEdit],
  );
  // Выбор у страницы один: щелчки по клеткам ведут выбранную фигурку или (у мастера)
  // выбранного монстра (docs/plan/done/creature-movement.md).
  const sceneEditor = viewOnly
    ? null
    : ((editing && ready ? editor.sceneEditor : null) ??
      play.editor ??
      cards.walk.editor);
  const handleReady = useCallback(() => setReadySceneId(sceneId), [sceneId]);
  const tools = master && ready !== null && !viewOnly;
  const editTools = tools && editing;
  const shownState = useMemo(
    () =>
      state && eyesFog && rules.refs
        ? playersView(state, eyesFog, rules.refs)
        : state,
    [state, eyesFog, rules.refs],
  );

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
          onSceneEdit={sceneEdit}
          onSceneFog={receiveFog}
          onFogChanged={sceneFog.refresh}
          onFigures={cards.onChanged}
          onFigureDrag={play.ghosts.receive}
          dragSenderRef={play.dragSenderRef}
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
              map={shownState ?? ready.state}
              refs={ready.view.refs}
              cutY={cutY === null ? Number.POSITIVE_INFINITY : sliderY}
              camera={camera}
              resizePreview={null}
              editor={sceneEditor}
              walk={viewOnly ? null : (play.walk ?? cards.walk.scene)}
              objectTool={
                editTools && editor.tool === 'place' ? objects.scene : null
              }
              focusRef={focusRef}
              onReady={handleReady}
              settings={user?.settings ?? DEFAULT_USER_SETTINGS}
              objectImages={images}
              hideContainerContents={ready.view.contentsHidden || viewOnly}
              figures={figures.inputs}
              figureGhosts={play.ghosts.ghosts}
              figureDrag={viewOnly ? undefined : play.drag}
              creatures={
                viewOnly ? { ...cards.view, onPick: undefined } : cards.view
              }
              fog={fog}
            />
          </Suspense>
        )}
        {tools && (
          <SceneToolbar
            // В «Игре» полосы нет: остаются отмена и возврат — ход тоже отменяется.
            tools={editing ? SCENE_TOOLS : []}
            tool={editor.tool}
            onTool={editor.setTool}
            busy={edits.busy}
            onUndo={edits.undo}
            onRedo={edits.redo}
            leading={<SceneModeSwitch mode={mode} onChange={setMode} />}
          />
        )}
        {ready && bounds && bounds.max[1] > bounds.min[1] && (
          <CutRuler
            min={bounds.min[1]}
            max={bounds.max[1]}
            value={sliderY}
            // Шкала на самом верху — «без среза», как в редакторе.
            onChange={(y) => setCutY(y >= bounds.max[1] ? null : y)}
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
      >
        {master && view && <FogPanel fog={sceneFog} />}
        {figures.figures && (
          <FiguresPanel
            figures={figures.figures}
            master={master}
            free={editing}
            tool={play.tool}
          />
        )}
        {ready && (
          <CreatureCards
            gameId={id}
            master={master}
            cards={cards}
            figure={play.tool.figure}
          />
        )}
        {editTools && (
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
