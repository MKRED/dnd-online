import type { CSSProperties } from 'react';

// Высота окна карточки (вариант А, замечания после первой партии, 2026-10-26):
// null — как открылось: по содержимому, но не выше половины сцены; 'fit' — по содержимому
// до низа сцены (двойной щелчок по ручке); число — высота, которую вытянули ручкой, px.
export type CardHeight = number | 'fit' | null;

// Ниже окно — одна шапка с полоской содержимого: тянуть дальше незачем.
export const MIN_CARD_HEIGHT = 140;

const STORAGE_KEY = 'scene.cardHeight';

// Последняя вытянутая высота: следующее окно открывается такой же. Привычка одна на все
// игры этого браузера; хранилище может быть недоступно (приватный режим) — тогда как обычно.
export function readCardHeight(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(value) && value >= MIN_CARD_HEIGHT ? value : null;
  } catch (err: unknown) {
    console.error('Failed to read the card window height', err);
    return null;
  }
}

// null — забыть: следующие окна снова открываются высотой по содержимому.
export function saveCardHeight(height: number | null) {
  try {
    if (height === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, String(Math.round(height)));
  } catch (err: unknown) {
    console.error('Failed to remember the card window height', err);
  }
}

// Размер окна, верх которого стоит на y: низ — никогда не ниже низа сцены.
export function cardHeightStyle(
  height: CardHeight,
  y: number,
  minimized: boolean,
): CSSProperties {
  const bottom = `calc(100% - ${y + 16}px)`;
  if (minimized || height === 'fit') return { maxHeight: bottom };
  if (height === null) return { maxHeight: `min(50%, ${bottom})` };
  return { height, maxHeight: bottom };
}
