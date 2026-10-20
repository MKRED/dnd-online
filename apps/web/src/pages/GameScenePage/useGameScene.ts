import { useCallback, useEffect, useRef, useState } from 'react';
import {
  mapBounds,
  type Box3,
  type GameDetail,
  type GameSceneView,
} from 'shared';
import { getGame, getGameScene } from '../../features/games';
import { mapStateFromChunks } from '../../features/maps';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import { ApiError, errorMessage } from '../../lib/apiRequest';

export type SceneLoad =
  | { kind: 'loading' }
  | {
      kind: 'ready';
      game: GameDetail;
      view: GameSceneView;
      state: MapViewState;
      // Кадр камеры: площадь сцены до верхнего блока на момент открытия сцены.
      frame: Box3;
    }
  // Активной сцены нет — мастер её ещё не добавил.
  | { kind: 'none'; game: GameDetail }
  // Сцена игроку закрыта или игра без входа — его место в лобби.
  | { kind: 'away' }
  | { kind: 'error'; message: string };

function frameOf(state: MapViewState): Box3 {
  const top = mapBounds(state.store)?.max[1] ?? 0;
  return {
    min: [0, 0, 0],
    max: [state.size.width - 1, top, state.size.depth - 1],
  };
}

// Страница сцены: игра (роль, название) и активная сцена. reload — после событий сокета:
// сцену сменили, перезапустили, открыли или закрыли.
export function useGameScene(gameId: string) {
  const [load, setLoad] = useState<SceneLoad>({ kind: 'loading' });
  // Запросы могут обгонять друг друга при частых событиях: побеждает последний.
  const requestRef = useRef(0);

  const reload = useCallback(() => {
    const request = ++requestRef.current;
    const current = () => request === requestRef.current;
    getGame(gameId)
      .then(async (game) => {
        try {
          const view = await getGameScene(gameId);
          if (!current()) return;
          const state = mapStateFromChunks(view);
          setLoad((prev) => ({
            kind: 'ready',
            game,
            view,
            state,
            // Та же сцена — камера остаётся на месте.
            frame:
              prev.kind === 'ready' && prev.view.scene.id === view.scene.id
                ? prev.frame
                : frameOf(state),
          }));
        } catch (err: unknown) {
          if (!current()) return;
          if (err instanceof ApiError && err.status === 404) {
            setLoad({ kind: 'none', game });
            return;
          }
          throw err;
        }
      })
      .catch((err: unknown) => {
        if (!current()) return;
        if (err instanceof ApiError && err.status === 403) {
          setLoad({ kind: 'away' });
          return;
        }
        console.error('Failed to load game scene', err);
        setLoad({
          kind: 'error',
          message: errorMessage(err, 'Не удалось загрузить сцену'),
        });
      });
  }, [gameId]);

  useEffect(reload, [reload]);

  return { load, setLoad, reload };
}
