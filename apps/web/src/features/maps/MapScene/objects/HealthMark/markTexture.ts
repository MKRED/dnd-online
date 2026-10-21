import { useEffect, useState } from 'react';
import { CanvasTexture, LinearMipmapLinearFilter, SRGBColorSpace } from 'three';
import type { CreatureHealth, HealthMarkStyle } from 'shared';
import { drawHealthMark, MARK_FONTS } from '../../../healthMarkDraw';

// Текстура метки из холста healthMarkDraw.ts: шрифты приложения, без загрузки шрифтов
// в сцену (drei Text берёт шрифт с CDN).

export interface MarkTexture {
  texture: CanvasTexture;
  // Ширина к высоте.
  aspect: number;
}

function markTexture(
  style: HealthMarkStyle,
  label: string,
  health: CreatureHealth,
): MarkTexture | null {
  const canvas = drawHealthMark(style, label, health);
  if (!canvas) return null;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  // Издалека метка мелкая — мипмапы, чтобы буквы не рябили.
  texture.minFilter = LinearMipmapLinearFilter;
  texture.anisotropy = 4;
  return { texture, aspect: canvas.width / canvas.height };
}

// Подписей четыре, видов три — текстуры общие на всю страницу и не освобождаются.
// В ключе — загружен ли шрифт: до загрузки рисуем запасным, потом перерисовываем.
const cache = new Map<string, MarkTexture | null>();

// Без API шрифтов (старый браузер, jsdom) считаем шрифт загруженным.
const fonts = () =>
  typeof document.fonts?.load === 'function' ? document.fonts : null;
const fontLoaded = (font: string) => fonts()?.check(font) ?? true;

export function useMarkTexture(
  style: HealthMarkStyle,
  label: string,
  health: CreatureHealth,
): MarkTexture | null {
  const font = MARK_FONTS[style];
  const [loadedFont, setLoadedFont] = useState<string | null>(() =>
    fontLoaded(font) ? font : null,
  );
  const loaded = loadedFont === font || fontLoaded(font);
  useEffect(() => {
    const api = fonts();
    if (loaded || !api) return;
    let active = true;
    api
      .load(font)
      .then(() => {
        if (active) setLoadedFont(font);
      })
      .catch((err: unknown) => {
        console.error('Health mark font failed to load', err);
      });
    return () => {
      active = false;
    };
  }, [font, loaded]);
  const key = `${style}|${label}|${health}|${loaded}`;
  if (!cache.has(key)) cache.set(key, markTexture(style, label, health));
  return cache.get(key) ?? null;
}
