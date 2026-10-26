import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameFigures } from 'shared';
import {
  figureImagePath,
  figureModelPath,
  getGameFigures,
} from '../../../features/games';
import type { FigureInput } from '../../../features/maps/MapScene';
import { ApiError } from '../../../lib/apiRequest';

// Фигурки персонажей на активной сцене (docs/plan/done/game.md, этап 7). Перечитываются
// целиком после событий фигурок: их немного, а ход по пути считает сервер. Ответ старше
// уже показанного (по номеру журнала) не откатывает фигурки назад.
export function useSceneFigures(gameId: string, sceneId: string | null) {
  const [loaded, setLoaded] = useState<GameFigures | null>(null);
  const seqRef = useRef(-1);

  // Ответ чтения или правки; старше показанного — не откатывает.
  const apply = useCallback((result: GameFigures) => {
    if (result.eventSeq < seqRef.current) return;
    seqRef.current = result.eventSeq;
    setLoaded(result);
  }, []);

  const reload = useCallback(() => {
    if (!sceneId) return;
    getGameFigures(gameId)
      .then(apply)
      .catch((err: unknown) => {
        // Сцену закрыли или сменили — это перечитает сама страница сцены.
        if (err instanceof ApiError && [403, 404].includes(err.status)) return;
        console.error('Failed to load scene figures', err);
      });
  }, [gameId, sceneId, apply]);

  useEffect(reload, [reload]);

  // Фигурки другой сцены (ответ пришёл до смены) не показываются.
  const current = loaded?.sceneId === sceneId ? loaded : null;
  const inputs = useMemo<FigureInput[]>(
    () =>
      (current?.figures ?? []).map((figure) => ({
        id: figure.character.id,
        name: figure.character.name,
        at: figure.at,
        facing: figure.facing,
        size: figure.size,
        image: figureImagePath(gameId, figure),
        model: figure.model && {
          kind: 'file' as const,
          path: figureModelPath(gameId, figure, figure.model.version),
          format: figure.model.format,
          color: figure.model.color,
          fit: figure.model.fit,
        },
        selectable: figure.canMove,
        health: figure.health,
      })),
    [current, gameId],
  );
  return { figures: current, inputs, reload, apply };
}
