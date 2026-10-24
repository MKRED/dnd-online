import { useCallback, useState } from 'react';

// Чья карточка открыта (docs/plan/scene-page.md, этап 4): персонаж игрока — по id листа,
// монстр или НПС — по номеру объекта сцены (у экземпляра свои хиты и эффекты).
export type CardTarget =
  { kind: 'character'; id: string } | { kind: 'creature'; objectId: number };

export interface CardWindow {
  key: string;
  target: CardTarget;
  // Левый верхний угол окна на сцене, px.
  x: number;
  y: number;
  // Свёрнуто в шапку.
  minimized: boolean;
}

export const cardKey = (target: CardTarget) =>
  target.kind === 'character' ? `c:${target.id}` : `m:${target.objectId}`;

// Больше трёх окон мешают видеть сцену: четвёртое закрывает самое старое.
export const MAX_CARD_WINDOWS = 3;
// Новое окно — лесенкой от верхнего левого угла сцены, чтобы не легло ровно на прошлое.
const FIRST = { x: 72, y: 64 };
const STEP = 32;

// Открытые окна карточек. Порядок в списке — порядок наложения: последнее сверху и
// оно же «текущее» на телефоне.
export function useCardWindows() {
  const [windows, setWindows] = useState<CardWindow[]>([]);

  // Открыть или поднять уже открытое (и развернуть его).
  const open = useCallback((target: CardTarget) => {
    const key = cardKey(target);
    setWindows((prev) => {
      const found = prev.find((w) => w.key === key);
      if (found) {
        return [
          ...prev.filter((w) => w.key !== key),
          { ...found, minimized: false },
        ];
      }
      const n = prev.length;
      const next: CardWindow = {
        key,
        target,
        x: FIRST.x + n * STEP,
        y: FIRST.y + n * STEP,
        minimized: false,
      };
      return [...prev, next].slice(-MAX_CARD_WINDOWS);
    });
  }, []);

  const close = useCallback(
    (key: string) => setWindows((prev) => prev.filter((w) => w.key !== key)),
    [],
  );

  const raise = useCallback(
    (key: string) =>
      setWindows((prev) => {
        const found = prev.find((w) => w.key === key);
        if (!found || prev[prev.length - 1] === found) return prev;
        return [...prev.filter((w) => w.key !== key), found];
      }),
    [],
  );

  const update = useCallback(
    (key: string, patch: Partial<Pick<CardWindow, 'x' | 'y' | 'minimized'>>) =>
      setWindows((prev) =>
        prev.map((w) => (w.key === key ? { ...w, ...patch } : w)),
      ),
    [],
  );

  return { windows, open, close, raise, update };
}

export type CardWindows = ReturnType<typeof useCardWindows>;
