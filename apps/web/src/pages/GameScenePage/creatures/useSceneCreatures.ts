import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CreatureHealth, GameCreatures } from 'shared';
import { getGameCreatures } from '../../../features/games';
import { ApiError } from '../../../lib/apiRequest';

// Монстры и НПС активной сцены (docs/plan/game.md, этап 8): мастеру — хиты и эффекты,
// игроку — метки здоровья. Перечитываются целиком, как фигурки; ответ старше уже
// показанного (по номеру журнала) не откатывает их назад.
export function useSceneCreatures(gameId: string, sceneId: string | null) {
  const [loaded, setLoaded] = useState<GameCreatures | null>(null);
  const seqRef = useRef(-1);

  const apply = useCallback((result: GameCreatures) => {
    if (result.eventSeq < seqRef.current) return;
    seqRef.current = result.eventSeq;
    setLoaded(result);
  }, []);

  const reload = useCallback(() => {
    if (!sceneId) return;
    getGameCreatures(gameId)
      .then(apply)
      .catch((err: unknown) => {
        // Сцену закрыли или сменили — это перечитает сама страница сцены.
        if (err instanceof ApiError && [403, 404].includes(err.status)) return;
        console.error('Failed to load scene creatures', err);
      });
  }, [gameId, sceneId, apply]);

  useEffect(reload, [reload]);

  const current = loaded?.sceneId === sceneId ? loaded : null;
  const health = useMemo(
    () =>
      new Map<number, CreatureHealth>(
        (current?.creatures ?? []).flatMap((c) =>
          c.health ? [[c.objectId, c.health]] : [],
        ),
      ),
    [current],
  );
  return { creatures: current, health, reload, apply };
}
