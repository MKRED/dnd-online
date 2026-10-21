import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  SIGHT_RANGE_DEFAULT,
  type GameSceneFogInput,
  type GameSceneFogView,
  type GameSceneStatus,
} from 'shared';
import { getGameSceneFog, setGameSceneFog } from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';
import type { SceneLoad } from '../useGameScene';

// Туман войны у мастера на странице сцены (docs/plan/done/fog-of-war.md, этап 6): включить,
// дальность обзора и «Глазами игроков» — маски тумана поверх его полной сцены.
export function useSceneFog(
  gameId: string,
  scene: GameSceneStatus | null,
  master: boolean,
  setLoad: Dispatch<SetStateAction<SceneLoad>>,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eyes, setEyes] = useState(false);
  const [masks, setMasks] = useState<GameSceneFogView | null>(null);
  // Номер запроса масок: ответ на устаревший запрос не ложится поверх свежего.
  const [version, setVersion] = useState(0);
  const fogOn = Boolean(scene?.fog);
  const active = master && eyes && fogOn;

  const save = (input: GameSceneFogInput) => {
    if (!scene) return;
    setBusy(true);
    setError(null);
    setGameSceneFog(gameId, scene.id, input)
      .then(() =>
        setLoad((prev) =>
          prev.kind === 'ready'
            ? {
                ...prev,
                view: {
                  ...prev.view,
                  scene: {
                    ...prev.view.scene,
                    fog: input.enabled,
                    sightRange: input.sightRange,
                  },
                },
              }
            : prev,
        ),
      )
      .catch((err: unknown) => {
        console.error('Failed to change scene fog', err);
        setError(errorMessage(err, 'Не удалось изменить туман войны'));
      })
      .finally(() => setBusy(false));
  };

  // Маски — пока включено «Глазами игроков»; после событий тумана — заново (refresh).
  useEffect(() => {
    if (!active) return;
    let current = true;
    getGameSceneFog(gameId)
      .then((fog) => {
        if (current) setMasks(fog);
      })
      .catch((err: unknown) => {
        console.error('Failed to load scene fog', err);
        if (current) setError(errorMessage(err, 'Не удалось загрузить туман'));
      });
    return () => {
      current = false;
    };
  }, [active, gameId, version, scene?.id]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);

  return {
    busy,
    error,
    fogOn,
    sightRange: scene?.sightRange ?? SIGHT_RANGE_DEFAULT,
    eyes: eyes && fogOn,
    setEyes,
    save,
    refresh,
    // Маски для просмотра: только пока режим включён и они загрузились.
    masks: active ? masks : null,
  };
}

export type SceneFogControls = ReturnType<typeof useSceneFog>;
