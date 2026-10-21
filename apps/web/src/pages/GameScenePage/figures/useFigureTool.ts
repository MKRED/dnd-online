import { useCallback, useMemo, useState } from 'react';
import {
  FIGURE_SIZE,
  movementAllowance,
  reachable,
  standHeight,
  type GameFigure,
  type GameFigures,
  type MapObjectRefsView,
  type Occupant,
  type Reach,
  type Vec3,
} from 'shared';
import type {
  PickedCells,
  SceneEditor,
} from '../../../features/maps/editor/editorTools';
import type { MapViewState } from '../../../features/maps/mapStateFromChunks';
import { reachTiles } from '../../../features/maps/walkTest/reachTiles';
import { walkBody } from '../../../features/maps/walkTest/walkTarget';
import type { WalkScene } from '../../../features/maps/walkTest';
import type { figureApi } from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';
import { figureHover } from './figureHover';
import { sceneOccupants } from './sceneOccupants';
import { useFigureDragging } from './useFigureDragging';

interface FigureToolOptions {
  master: boolean;
  state: MapViewState | null;
  refs: MapObjectRefsView | null;
  figures: GameFigures | null;
  api: ReturnType<typeof figureApi>;
  // Ответ правки — фигурки глазами того, кто правил: показать сразу.
  onFigures: (figures: GameFigures) => void;
  // Куда тянут выбранную фигурку — остальным по сокету; null — отпустили.
  onDrag?: (characterId: string, at: Vec3 | null) => void;
}

// Выбранная фигурка на сцене игры (docs/plan/done/game.md, этап 7): куда она дойдёт на
// оставшийся запас (плитки, как у «Хода» в редакторе), путь под курсором и ход по клику.
// Мастер ставит выбранную фигурку или персонажа «Не на сцене» на любую свободную клетку.
export function useFigureTool({
  master,
  state,
  refs,
  figures,
  api,
  onFigures,
  onDrag,
}: FigureToolOptions) {
  // Персонаж, которого водят: фигурка на сцене или (у мастера) «Не на сцене».
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const figure: GameFigure | null =
    figures?.figures.find((f) => f.character.id === selectedId) ?? null;
  const placing =
    master && !figure
      ? (figures?.unplaced.find((c) => c.id === selectedId) ?? null)
      : null;
  const active = figure !== null || placing !== null;

  // Кто мешает: существа карты, которые видит смотрящий, и остальные фигурки.
  const others = useMemo<Occupant[]>(
    () =>
      state && refs
        ? [
            ...sceneOccupants(state, refs),
            ...(figures?.figures ?? [])
              .filter((f) => f.character.id !== selectedId)
              .map((f) => ({ at: f.at, size: f.size, ally: true })),
          ]
        : [],
    [state, refs, figures, selectedId],
  );

  const left = useMemo(
    () => (figure ? movementAllowance(figure) : { walk: 0, climb: null }),
    [figure],
  );
  // Достижимые позиции — только когда фигурка выбрана: пересчёт на ход и правку карты,
  // не на движение мыши.
  const reach = useMemo<Reach[]>(
    () =>
      state && figure
        ? reachable(state, figure.at, figure.size, left, others)
        : [],
    [state, figure, left, others],
  );

  const scene = useMemo<WalkScene | null>(() => {
    if (!state || !figure) return null;
    return {
      token: {
        body: walkBody(state, figure.at, figure.size),
        ok: standHeight(state, figure.at, figure.size) !== null,
      },
      tiles: reachTiles(
        state,
        reach.filter((r) => r.end),
        figure.size,
      ),
      budget: Math.max(left.walk, left.climb ?? 0),
    };
  }, [state, figure, reach, left]);

  const preview = useCallback(
    (cells: PickedCells) =>
      state &&
      figureHover(
        state,
        reach,
        cells,
        FIGURE_SIZE,
        others,
        master,
        figure?.at ?? null,
      ),
    [state, reach, others, master, figure],
  );

  // Правки по одной: пока запрос в пути, новые не принимаются. Ответ — фигурки глазами
  // правившего, они показываются сразу, не дожидаясь сокета.
  const run = useCallback(
    (request: () => Promise<GameFigures>, failure: string) => {
      if (busy) return;
      setBusy(true);
      setError(null);
      request()
        .then(onFigures)
        .catch((err: unknown) => {
          console.error(failure, err);
          setError(errorMessage(err, failure));
        })
        .finally(() => setBusy(false));
    },
    [busy, onFigures],
  );

  const pick = useCallback(
    (cells: PickedCells) => {
      const hover = preview(cells);
      if (!selectedId || !hover || hover.kind === 'blocked') return;
      if (hover.kind === 'move') {
        run(() => api.move(selectedId, hover.anchor), 'Не удалось сделать ход');
      } else {
        run(
          () => api.place(selectedId, hover.anchor),
          'Не удалось поставить фигурку',
        );
      }
    },
    [selectedId, preview, api, run],
  );

  const dragging = useFigureDragging({
    selectedId,
    select: setSelectedId,
    preview,
    pick,
    onDrag,
  });
  const { onHover } = dragging;

  const editor = useMemo<SceneEditor | null>(
    () =>
      active
        ? {
            tool: 'walk',
            anchor: null,
            height: 1,
            onPick: pick,
            preview,
            onHover,
          }
        : null,
    [active, pick, preview, onHover],
  );

  return {
    selectedId,
    select: setSelectedId,
    round: () => run(api.round, 'Не удалось начать новый раунд'),
    allowance: (characterId: string, change: 'refresh' | 'dash') =>
      run(
        () => api.allowance(characterId, change),
        change === 'dash'
          ? 'Не удалось дать «Рывок»'
          : 'Не удалось обновить запас',
      ),
    figure,
    placing,
    left,
    busy,
    error,
    editor,
    scene,
    grab: dragging.grab,
    release: dragging.release,
  };
}

export type FigureTool = ReturnType<typeof useFigureTool>;
