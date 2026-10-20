import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  mapBounds,
  type Box3,
  type GameDetail,
  type GameSceneEditMessage,
  type GameSceneView,
} from 'shared';
import { getGame, getGameScene, sceneEditApi } from '../../features/games';
import { mapStateFromChunks } from '../../features/maps';
import type { MapViewState } from '../../features/maps/mapStateFromChunks';
import {
  useMapEdits,
  type EditableCopy,
} from '../../features/maps/useMapEdits';
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
// сцену сменили, перезапустили, открыли или закрыли. Правки сцены (этап 6) — свои у
// мастера и пришедшие по сокету — применяются к копии через useMapEdits.
export function useGameScene(gameId: string) {
  const [load, setLoad] = useState<SceneLoad>({ kind: 'loading' });
  // Запросы могут обгонять друг друга при частых событиях: побеждает последний.
  const requestRef = useRef(0);
  // Номер последней правки сцены в копии (game_scenes.seq) и сама копия для правок —
  // ставятся вместе с состоянием (useMapEdits).
  const seqRef = useRef(-1);
  const copyRef = useRef<EditableCopy | null>(null);

  const reload = useCallback(() => {
    const request = ++requestRef.current;
    const current = () => request === requestRef.current;
    getGame(gameId)
      .then(async (game) => {
        try {
          const view = await getGameScene(gameId);
          if (!current()) return;
          const state = mapStateFromChunks(view);
          seqRef.current = view.seq;
          copyRef.current = { state, refs: view.refs };
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
            copyRef.current = null;
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

  const ready = load.kind === 'ready' ? load : null;
  const sceneId = ready?.view.scene.id ?? null;
  const onApplied = useCallback(
    (next: EditableCopy, seq: number) =>
      setLoad((prev) =>
        prev.kind === 'ready'
          ? {
              ...prev,
              state: next.state,
              view: { ...prev.view, refs: next.refs, seq },
            }
          : prev,
      ),
    [],
  );
  const api = useMemo(
    () => sceneEditApi(gameId, sceneId ?? ''),
    [gameId, sceneId],
  );
  const edits = useMapEdits({
    copyRef,
    seqRef,
    onApplied,
    refresh: reload,
    api,
  });

  // Правка сцены по сокету: другой сцены (мастер правил неактивную) страница не ждёт.
  const { receive } = edits;
  const receiveEdit = useCallback(
    (message: GameSceneEditMessage) => {
      if (message.sceneId !== sceneId) return;
      void receive(message.seq, message.changes, message.refs);
    },
    [receive, sceneId],
  );

  return { load, setLoad, reload, edits, receiveEdit };
}
