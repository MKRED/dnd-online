import { useCallback, useState } from 'react';
import { readCardHeight, type CardHeight } from './cardHeight';

// Чья карточка открыта (docs/plan/done/scene-page.md, этап 4): персонаж игрока — по id листа,
// монстр или НПС — по номеру объекта сцены (у экземпляра свои хиты и эффекты).
// Объект сцены (сундук, предмет на полу, дверь) и предмет из библиотеки — этап 6.
// Способность, эффект или предмет из листа и карточек — своим окном, name — подпись до
// загрузки (замечания после первой партии, 2026-10-26).
export type CardTarget =
  | { kind: 'character'; id: string }
  | { kind: 'creature'; objectId: number }
  | { kind: 'object'; objectId: number }
  | { kind: 'item'; itemId: string; name?: string }
  | { kind: 'ability'; id: string; name: string }
  | { kind: 'effect'; id: string; name: string };

export interface CardWindow {
  key: string;
  target: CardTarget;
  // Левый верхний угол окна на сцене, px.
  x: number;
  y: number;
  // Свёрнуто в шапку.
  minimized: boolean;
  height: CardHeight;
}

export function cardKey(target: CardTarget): string {
  switch (target.kind) {
    case 'character':
      return `c:${target.id}`;
    case 'creature':
      return `m:${target.objectId}`;
    case 'object':
      return `o:${target.objectId}`;
    case 'item':
      return `i:${target.itemId}`;
    case 'ability':
      return `a:${target.id}`;
    case 'effect':
      return `e:${target.id}`;
  }
}

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
        // Новое окно — той высоты, что вытянули в прошлый раз.
        height: readCardHeight(),
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
    (
      key: string,
      patch: Partial<Pick<CardWindow, 'x' | 'y' | 'minimized' | 'height'>>,
    ) =>
      setWindows((prev) =>
        prev.map((w) => (w.key === key ? { ...w, ...patch } : w)),
      ),
    [],
  );

  return { windows, open, close, raise, update };
}

export type CardWindows = ReturnType<typeof useCardWindows>;
