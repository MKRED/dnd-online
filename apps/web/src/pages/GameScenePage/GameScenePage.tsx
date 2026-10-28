import { Alert, Anchor, Loader, Text, VisuallyHidden } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
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
  mapBounds,
  type CombatantRef,
  type GameSceneEditMessage,
  type Vec3,
} from 'shared';
import { useAuth } from '../../features/auth';
import { useDeviceSettings } from '../../features/profile';
import { RecordLinkContext, type OpenRecord } from '../../features/catalog';
import { sceneObjectImages } from '../../features/games';
import {
  parseCameraParams,
  placeCamera,
  type CameraPlacement,
} from '../../features/maps/cameraView';
import { useFogMasks } from '../../features/maps/fogMasks';
import { useRulesState } from '../../features/maps/useRulesState';
import CutRuler from '../../features/maps/CutRuler';
import { SceneToolbar } from '../../features/maps/editor';
import type {
  CameraFocusApi,
  SceneAttackTargets,
} from '../../features/maps/MapScene';
import { createHoverStore } from '../../features/maps/MapScene/hoverStore';
import { ToolHint } from '../../features/maps/editor/ToolPanel';
import { usePageTitle } from '../../lib/usePageTitle';
import classes from './GameScenePage.module.css';
import SceneRoom from './SceneRoom';
import SceneToolsPanel from './SceneToolsPanel';
import { useGameScene } from './useGameScene';
import ScenePlaque from './ScenePlaque/ScenePlaque';
import { plaqueState } from './ScenePlaque/plaqueState';
import { CardWindows, useCardWindows } from './cardWindows';
import { CreatureCards, useCreatureCards } from './creatures';
import { useScenePlay } from './figures';
import { editFigureDrag } from './figures/editFigureDrag';
import {
  AttackTargetingContext,
  CombatOverlay,
  MoveModeContext,
  combatantTurnNow,
  figureTurnNow,
  turnFigureDrag,
  useCombatUi,
  useSceneCombat,
} from './combat';
import { playersView, useSceneFog } from './fog';
import { SceneModeSwitch, useSceneMode } from './mode';
import { useJournalLive } from './journal';
import { useSceneWalks, withDeparted } from './walks';
import { withoutStarts } from './withoutStarts';
import {
  figureWalkKey,
  objectWalkKey,
} from '../../features/maps/MapScene/walks/sceneWalk';
import { GameScenePanel } from './panel';
import { creaturePortrait } from './participants';
import { useSceneOpen } from './useSceneOpen';
import { readSceneCamera, saveSceneCamera } from './sceneCamera';
import { SCENE_TOOLS, useSceneTools } from './useSceneTools';

// three.js тяжёлый — сцена грузится отдельным чанком.
const MapScene = lazy(() => import('../../features/maps/MapScene'));

// Страница сцены /games/:id/scene (docs/plan/done/game.md, этапы 5–8): активная сцена игры в
// 3D. Мастер правит её инструментами редактора карты, игроки видят каждую правку сразу.
// Игрока, которому мастер закрыл сцену, переводит в лобби.
function GameScenePage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  // Метки — из аккаунта, графика — этого устройства (замечания после первой партии).
  const settings = useDeviceSettings();
  const navigate = useNavigate();
  const { load, setLoad, reload, edits, receiveEdit, receiveFog } =
    useGameScene(id);
  const game = load.kind === 'ready' || load.kind === 'none' ? load.game : null;
  const master = game?.role === 'master';
  // Мастеру: живые записи журнала для вкладки «Журнал» (этап 7).
  const journal = useJournalLive(user?.id ?? null);
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
  // Встреча не идёт — игрок только смотрит (docs/dnd/movement.md, «Outside a session»): ни
  // выбора фигурки, ни хода, ни перетаскивания, карточки без правок. Мастер не ограничен.
  const watchOnly = game !== null && !master && game.sessionStartedAt === null;
  // Режим мастера (docs/plan/done/scene-page.md): в «Игре» нет инструментов редактора, в
  // «Правке» — есть, а фигурки и существа переставляются без хода.
  const { mode, setMode } = useSceneMode(master, ready !== null && !viewOnly);
  const editing = master && mode === 'edit';
  // Выбор героя снимается, когда в «Существах» выбрали монстра: фигурки появляются ниже.
  const clearFigureRef = useRef<() => void>(() => undefined);
  const focusCreature = useCallback(() => clearFigureRef.current(), []);
  const { editor, objects, creatures } = useSceneTools({
    master,
    editing,
    state: ready?.state ?? null,
    refs: view?.refs ?? null,
    edits,
    onCreatureFocus: focusCreature,
  });
  const [readySceneId, setReadySceneId] = useState<string | null>(null);
  const [cutY, setCutY] = useState<number | null>(null);
  const focusRef = useRef<CameraFocusApi | null>(null);
  // Та же граница, что у панели: на ней панель уходит под сцену.
  const narrow = useMediaQuery('(max-width: 48em)');
  // Клетка под курсором — и сцене, и панели инструмента (docs/plan/done/scene-page.md, этап 3).
  const [hover] = useState(createHoverStore);
  // Открытые окна карточек существ (docs/plan/done/scene-page.md, этап 4).
  const windows = useCardWindows();
  const { open: openWindow } = windows;
  // Способность, эффект или предмет из листа и карточек открывается окном, не уводя со
  // сцены (замечания после первой партии, 2026-10-26, вариант А).
  const openRecord = useCallback<OpenRecord>(
    (kind, recordId, name) =>
      openWindow(
        kind === 'item'
          ? { kind, itemId: recordId, name }
          : { kind, id: recordId, name },
      ),
    [openWindow],
  );
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
  const cameraSceneId = ready?.view.scene.id ?? null;
  // Ракурс из адреса важнее запомненного: ссылкой делятся видом. Без него — где камера
  // стояла у этого человека перед обновлением страницы.
  const camera = useMemo(() => {
    if (!frame) return null;
    const asked = viewParam !== null || cam !== null || target !== null;
    const saved =
      !asked && cameraSceneId ? readSceneCamera(cameraSceneId) : null;
    return (
      saved ??
      placeCamera(frame, parseCameraParams({ view: viewParam, cam, target }))
    );
  }, [frame, viewParam, cam, target, cameraSceneId]);
  const rememberCamera = useCallback(
    (placement: CameraPlacement) => {
      if (cameraSceneId) saveSceneCamera(cameraSceneId, placement);
    },
    [cameraSceneId],
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
  // Ходы по пути — прыжками по клеткам (docs/plan/done/walk-animation.md).
  const walks = useSceneWalks({
    sceneId,
    enabled: settings.animationFps > 0,
    objects: state?.objects ?? null,
  });
  const { hold } = walks;
  const holdFigure = useCallback(
    (characterId: string, from: Vec3) => hold(figureWalkKey(characterId), from),
    [hold],
  );
  const holdCreature = useCallback(
    (objectId: number, from: Vec3) => hold(objectWalkKey(objectId), from),
    [hold],
  );
  const play = useScenePlay({
    gameId: id,
    sceneId,
    // В «Правке» фигурку выбирают в «Просмотре» (посмотреть) и в «Существах» (переставить):
    // другие инструменты правят карту. Вне встречи игроку выбирать нечего.
    active:
      !watchOnly &&
      (!editing || editor.tool === 'view' || editor.tool === 'creatures'),
    free: editing,
    state,
    refs: view?.refs ?? null,
    onMoveStart: holdFigure,
  });
  const { figures } = play;
  const { select: selectFigure } = play.tool;
  const clearFigure = useCallback(() => selectFigure(null), [selectFigure]);
  useEffect(() => {
    clearFigureRef.current = clearFigure;
  }, [clearFigure]);
  // Выбрали героя в «Существах» — монстр или ставящееся существо снимаются.
  const { clear: clearCreature } = creatures;
  const figureTool = useMemo(
    () => ({
      ...play.tool,
      select: (characterId: string | null) => {
        if (characterId) clearCreature();
        selectFigure(characterId);
      },
    }),
    [play.tool, clearCreature, selectFigure],
  );
  const cards = useCreatureCards({
    gameId: id,
    sceneId,
    master,
    state,
    refs: view?.refs ?? null,
    figures: figures.figures,
    // В «Просмотре» «Правки» щелчок по существу выбирает его, но не ведёт.
    canPick: master && (!editing || editor.tool === 'view'),
    canWalk: master && !editing,
    figureId: play.tool.selectedId,
    clearFigure,
    reloadFigures: figures.reload,
    onMoveStart: holdCreature,
  });
  // Бой с очерёдностью (docs/plan/combat.md, этап 3): полоса над сценой и окна.
  const combat = useSceneCombat(id, sceneId);
  const [combatDialog, setCombatDialog] = useState(false);
  // Цели атаки, пока у значка атаки выбирают цель: подсветка на сцене, щелчок — выбор цели.
  const [targeting, setTargeting] = useState<SceneAttackTargets | null>(null);
  // Пока выбирают цель, ход выбранной фигуркой молчит: ни клеток хода, ни пути, ни
  // переноса — щелчок по сцене должен значить «эта цель», а не «иди сюда». Отмена атаки
  // возвращает режим хода (замечание Михаила 2026-10-28).
  const aiming = targeting !== null;
  // В «Игре» с очерёдностью выбранный ходит только в свой ход — и у мастера: вне хода его
  // переставляют в «Правке» (замечание Михаила 2026-10-28). Выбрать и посмотреть можно.
  const selectedRef: CombatantRef | null = play.tool.selectedId
    ? { kind: 'figure', characterId: play.tool.selectedId }
    : cards.selected
      ? { kind: 'creature', objectId: cards.selected.objectId }
      : null;
  const outOfTurn =
    !editing &&
    selectedRef !== null &&
    !combatantTurnNow(combat.combat, selectedRef);
  const { reload: reloadCombat } = combat;
  const fighting = (combat.combat?.combatants.length ?? 0) > 0;
  const { onSceneEdit: creaturesSceneEdit } = cards;
  const sceneEdit = useCallback(
    (message: GameSceneEditMessage) => {
      receiveEdit(message);
      creaturesSceneEdit(message);
      // Мастер поставил, убрал или скрыл существо — меняются кандидаты в бой и участники.
      if (master || fighting) reloadCombat();
    },
    [receiveEdit, creaturesSceneEdit, master, fighting, reloadCombat],
  );
  const refs = view?.refs ?? null;
  const combatSources = useMemo(
    () => ({
      gameId: id,
      figures: figures.figures?.figures ?? [],
      creatures: cards.creatures.creatures?.creatures ?? [],
      objectOf: (objectId: number) => state?.objects.byId.get(objectId),
      portraitOf: (object: Parameters<typeof creaturePortrait>[0]) =>
        refs ? creaturePortrait(object, refs, images) : null,
    }),
    [id, figures.figures, cards.creatures.creatures, state, refs, images],
  );
  const combatUi = useCombatUi({
    combat,
    master,
    sources: combatSources,
    hidden: editing || viewOnly,
    dialog: combatDialog,
    onDialog: setCombatDialog,
    focus: (at) => focusRef.current?.focusOn([...at]),
    // Выбрать можно того, кого смотрящий водит: мастеру — любого, игроку — своего героя.
    select: (ref) => {
      if (ref.kind === 'creature') {
        if (master) cards.select(ref.objectId);
        return;
      }
      const figure = figures.figures?.figures.find(
        (f) => f.character.id === ref.characterId,
      );
      if (figure?.canMove) figureTool.select(ref.characterId);
    },
    version: cards.version,
  });
  // Выбор у страницы один: щелчки по клеткам ведут выбранную фигурку или (у мастера)
  // выбранного монстра (docs/plan/done/creature-movement.md).
  // В «Правке»: «Просмотр» клетками ничего не делает, в «Существах» выбранного героя ставит
  // фигурка, остальное — инструмент (замечания после первой партии, 2026-10-26).
  const sceneEditor =
    viewOnly || aiming || outOfTurn
      ? null
      : editing
        ? ready
          ? editor.tool === 'creatures'
            ? (play.editor ?? editor.sceneEditor)
            : editor.sceneEditor
          : null
        : (play.editor ?? cards.walk.editor);
  // В бою с очерёдностью фигурку тянут только в её ход; мастер в «Правке» — когда угодно.
  const combatState = combat.combat;
  const playDrag =
    master && editing
      ? play.drag
      : turnFigureDrag(play.drag, (characterId) =>
          figureTurnNow(combatState, characterId),
        );
  const figureDrag =
    viewOnly || aiming
      ? undefined
      : editFigureDrag({
          drag: playDrag,
          editing,
          tool: editor.tool,
          clearCreature,
          onOpen: (characterId) =>
            windows.open({ kind: 'character', id: characterId }),
        });
  const handleReady = useCallback(() => setReadySceneId(sceneId), [sceneId]);
  const tools = master && ready !== null && !viewOnly;
  const editTools = tools && editing;
  const shownState = useMemo(() => {
    const shown =
      state && eyesFog && rules.refs
        ? playersView(state, eyesFog, rules.refs)
        : state;
    // Старты мастеру видны только в «Правке».
    const clean = shown && !editing ? withoutStarts(shown) : shown;
    return clean && withDeparted(clean, walks.departed);
  }, [state, eyesFog, rules.refs, walks.departed, editing]);

  // Режим хода (docs/dnd/movement.md): пока фигурки не прочитаны, считаем бой — так строка
  // запаса не обещает лишнего.
  const moveMode = figures.figures?.mode ?? null;
  const freeMove = moveMode === 'free';
  // Выбранное на сцене важнее подсказки инструмента: плашка одна.
  const plaque = aiming
    ? null
    : plaqueState({
        placing: play.tool.placing,
        figure: play.tool.figure,
        free: editing,
        creature: play.tool.figure ? null : cards.selected,
        creatureMoving: cards.walk.moving,
        freeMove,
        outOfTurn,
        master,
      });

  const loader = (
    <div className={classes.placeholder}>
      <Loader />
    </div>
  );

  return (
    <MoveModeContext.Provider value={{ free: freeMove, watchOnly }}>
      <AttackTargetingContext.Provider value={setTargeting}>
        <RecordLinkContext.Provider value={openRecord}>
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
                onCombat={reloadCombat}
                onFigureDrag={play.ghosts.receive}
                onWalk={walks.receive}
                dragSenderRef={play.dragSenderRef}
                onLeave={() => void navigate(lobby)}
                onEvents={journal.add}
                onMissed={journal.resync}
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
                    onCameraChange={rememberCamera}
                    resizePreview={null}
                    editor={sceneEditor}
                    walk={
                      viewOnly || aiming || outOfTurn
                        ? null
                        : (play.walk ?? cards.walk.scene)
                    }
                    objectTool={
                      editTools && editor.tool === 'place'
                        ? objects.scene
                        : editTools && editor.tool === 'creatures'
                          ? creatures.scene
                          : null
                    }
                    focusRef={focusRef}
                    onReady={handleReady}
                    settings={settings}
                    objectImages={images}
                    hideContainerContents={
                      ready.view.contentsHidden || viewOnly
                    }
                    figures={figures.inputs}
                    figureGhosts={play.ghosts.ghosts}
                    figureDrag={figureDrag}
                    creatures={
                      viewOnly
                        ? { ...cards.view, onPick: undefined }
                        : {
                            ...cards.view,
                            targets: targeting,
                            // Мастер в «Игре» без выбранного: щелчок по сундуку, предмету или
                            // двери — окно сведений (docs/plan/done/scene-page.md, этап 6). С
                            // выбранной фигуркой щелчок идёт в ход.
                            // «Просмотр» «Правки»: двойной щелчок — окно карточки.
                            onOpen:
                              editTools && editor.tool === 'view'
                                ? (objectId: number) =>
                                    windows.open({ kind: 'creature', objectId })
                                : undefined,
                            onPickObject:
                              master &&
                              !editing &&
                              !play.tool.selectedId &&
                              !cards.selected
                                ? (objectId: number) =>
                                    windows.open({ kind: 'object', objectId })
                                : undefined,
                          }
                    }
                    fog={fog}
                    walks={walks.walks}
                    hover={hover}
                    showReadout={editTools}
                    readoutAfter={
                      editTools &&
                      (plaque ? (
                        <ScenePlaque state={plaque} raised inline />
                      ) : (
                        <ToolHint
                          editor={editor}
                          state={ready.state}
                          hover={hover}
                          placesObject={
                            editor.tool === 'creatures'
                              ? editor.placesCreature
                              : objects.settings.choice !== null
                          }
                        />
                      ))
                    }
                  />
                </Suspense>
              )}
              {tools && (
                <SceneToolbar
                  // В «Игре» нет ни полосы, ни отмены с возвратом: отменяют в «Правке»
                  // (решение пользователя, 2026-10-27).
                  tools={editing ? SCENE_TOOLS : []}
                  history={editing}
                  tool={editor.tool}
                  onTool={editor.setTool}
                  busy={edits.busy}
                  onUndo={edits.undo}
                  onRedo={edits.redo}
                  // На телефоне переключатель — в шапке панели (docs/plan/done/scene-page.md,
                  // «Телефон»).
                  leading={
                    narrow ? undefined : (
                      <SceneModeSwitch mode={mode} onChange={setMode} />
                    )
                  }
                />
              )}
              {/* В «Игре» строки координат нет — плашка выбранного по центру внизу. В «Правке»
            плашка стоит в строке координат, правее них (вариант А, 2026-10-24). */}
              {ready && !viewOnly && plaque && !editTools && (
                <ScenePlaque state={plaque} raised={false} />
              )}
              {/* Игроку — плашка боя или «только просмотр» вне встречи и уведомление о начале
            и конце боя и встречи. В бою с очерёдностью — полоса портретов, мастеру тоже. */}
              {ready && (
                <CombatOverlay
                  mode={master ? null : moveMode}
                  round={figures.figures?.round ?? null}
                  watchOnly={master ? false : watchOnly}
                  strip={combatUi.strip}
                  tools={tools}
                />
              )}
              {ready && combatUi.windows}
              {ready && bounds && bounds.max[1] > bounds.min[1] && (
                <CutRuler
                  min={bounds.min[1]}
                  max={bounds.max[1]}
                  value={sliderY}
                  // Шкала на самом верху — «без среза», как в редакторе.
                  onChange={(y) => setCutY(y >= bounds.max[1] ? null : y)}
                />
              )}
              {ready && (
                <CardWindows
                  gameId={id}
                  userId={user?.id ?? null}
                  master={master}
                  windows={windows}
                  figures={figures.figures}
                  figureTool={play.tool}
                  cards={cards}
                  state={state}
                  refs={view?.refs ?? null}
                  images={images}
                  applyOps={edits.applyOps}
                  busy={edits.busy}
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
            <GameScenePanel
              gameId={id}
              gameName={game?.name ?? ''}
              scene={view?.scene ?? null}
              state={state}
              master={master}
              editing={editing}
              open={open}
              fog={sceneFog}
              play={play}
              cards={cards}
              refs={view?.refs ?? null}
              images={images}
              onOpenCard={windows.open}
              journal={journal}
              combatOrdered={fighting}
              turn={combatUi.turn}
              onStartCombat={() => setCombatDialog(true)}
              modeSwitch={
                narrow && tools ? (
                  <SceneModeSwitch mode={mode} onChange={setMode} compact />
                ) : null
              }
              editBody={
                editTools && (
                  <SceneToolsPanel
                    editor={editor}
                    objects={objects}
                    creatures={creatures}
                    figures={figures.figures}
                    figureTool={figureTool}
                    state={ready.state}
                    refs={ready.view.refs}
                    busy={edits.busy}
                    editError={edits.editError}
                    onFocus={(point) => focusRef.current?.focusOn(point)}
                    hover={hover}
                    selected={
                      ((play.tool.figure?.canMove ?? false) ||
                        cards.selected?.state != null) && (
                        <CreatureCards
                          gameId={id}
                          master={master}
                          cards={cards}
                          figure={play.tool.figure}
                          onFigureAllowance={play.tool.allowance}
                          figureBusy={play.tool.busy}
                          onOpenCard={windows.open}
                        />
                      )
                    }
                  />
                )
              }
            />
          </div>
        </RecordLinkContext.Provider>
      </AttackTargetingContext.Provider>
    </MoveModeContext.Provider>
  );
}

export default GameScenePage;
