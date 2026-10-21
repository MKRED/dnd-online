import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FIGURE_DRAG_STALE_MS,
  type GameFigureDragMessage,
  type Vec3,
} from 'shared';
import type { FigureInput } from '../../../features/maps/MapScene';

interface Held {
  at: Vec3;
  // Когда пришла последняя позиция: без новостей тень пропадает.
  seenAt: number;
}

// Фигурки, которые сейчас тянут другие (docs/plan/done/game.md, этап 7): позиции приходят по
// сокету, в базу не пишутся. Тень пропадает, когда фигурку отпустили (at: null), и сама —
// если тянувший замолчал дольше FIGURE_DRAG_STALE_MS (отключился посреди перетаскивания).
export function useFigureGhosts(inputs: readonly FigureInput[]) {
  const [held, setHeld] = useState<ReadonlyMap<string, Held>>(new Map());

  const receive = useCallback((message: GameFigureDragMessage) => {
    setHeld((prev) => {
      const next = new Map(prev);
      if (message.at) {
        next.set(message.characterId, { at: message.at, seenAt: Date.now() });
      } else {
        next.delete(message.characterId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (held.size === 0) return;
    const timer = setInterval(() => {
      const now = Date.now();
      setHeld((prev) => {
        const next = new Map(
          [...prev].filter(([, h]) => now - h.seenAt < FIGURE_DRAG_STALE_MS),
        );
        return next.size === prev.size ? prev : next;
      });
    }, FIGURE_DRAG_STALE_MS / 4);
    return () => clearInterval(timer);
  }, [held.size]);

  // Тень — та же фигурка, только там, где её держат; её саму не выбрать.
  const ghosts = useMemo<FigureInput[]>(
    () =>
      inputs.flatMap((figure) => {
        const h = held.get(figure.id);
        return h ? [{ ...figure, at: h.at, selectable: false }] : [];
      }),
    [inputs, held],
  );
  return { ghosts, receive };
}
