import { afterEach, describe, expect, it } from 'vitest';
import {
  cardHeightStyle,
  MIN_CARD_HEIGHT,
  readCardHeight,
  saveCardHeight,
} from './cardHeight';

describe('cardHeight', () => {
  afterEach(() => localStorage.clear());

  it('новое окно — не выше половины сцены, «по содержимому» — до низа', () => {
    expect(cardHeightStyle(null, 64, false)).toEqual({
      maxHeight: 'min(50%, calc(100% - 80px))',
    });
    expect(cardHeightStyle('fit', 64, false)).toEqual({
      maxHeight: 'calc(100% - 80px)',
    });
    expect(cardHeightStyle(420, 64, false)).toEqual({
      height: 420,
      maxHeight: 'calc(100% - 80px)',
    });
  });

  it('свёрнутое — без своей высоты, одна шапка', () => {
    expect(cardHeightStyle(420, 64, true)).toEqual({
      maxHeight: 'calc(100% - 80px)',
    });
  });

  it('запоминает вытянутую высоту и забывает её', () => {
    expect(readCardHeight()).toBeNull();
    saveCardHeight(412.6);
    expect(readCardHeight()).toBe(413);
    saveCardHeight(null);
    expect(readCardHeight()).toBeNull();
    localStorage.setItem('scene.cardHeight', String(MIN_CARD_HEIGHT - 1));
    expect(readCardHeight()).toBeNull();
  });
});
