import { useState, type Dispatch, type SetStateAction } from 'react';
import { setGameSceneOpen } from '../../features/games';
import { errorMessage } from '../../lib/apiRequest';
import type { SceneLoad } from './useGameScene';

// «Открыта игрокам» на странице сцены: мастер переключает её здесь, как в лобби.
export function useSceneOpen(
  gameId: string,
  setLoad: Dispatch<SetStateAction<SceneLoad>>,
) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setOpen = (open: boolean) => {
    setBusy(true);
    setError(null);
    setGameSceneOpen(gameId, open)
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

  return { busy, error, setOpen };
}
