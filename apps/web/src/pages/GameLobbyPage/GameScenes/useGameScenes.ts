import { useCallback, useEffect, useState } from 'react';
import type { GameScenes } from 'shared';
import { listGameScenes } from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';

// Блок сцен мастера: загрузка, перечитывание по version (сцены поменялись в другой
// вкладке) и правки по одной. Каждая правка отвечает блоком целиком.
export function useGameScenes(gameId: string, version: number) {
  const [scenes, setScenes] = useState<GameScenes | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    listGameScenes(gameId)
      .then((loaded) => {
        if (active) setScenes(loaded);
      })
      .catch((err: unknown) => {
        console.error('Failed to load game scenes', err);
        if (active) setError(errorMessage(err, 'Не удалось загрузить сцены'));
      });
    return () => {
      active = false;
    };
  }, [gameId, version]);

  // Промис говорит, прошла ли правка: окно добавления закрывается только после успеха.
  const run = useCallback(
    (action: () => Promise<GameScenes>, failure: string): Promise<boolean> => {
      setBusy(true);
      setError(null);
      return action()
        .then((next) => {
          setScenes(next);
          return true;
        })
        .catch((err: unknown) => {
          console.error(failure, err);
          setError(errorMessage(err, failure));
          return false;
        })
        .finally(() => setBusy(false));
    },
    [],
  );

  return { scenes, error, busy, run };
}
