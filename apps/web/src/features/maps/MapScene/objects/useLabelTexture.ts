import { useEffect, useMemo } from 'react';
import { CanvasTexture, SRGBColorSpace } from 'three';

const SIZE = 128;

// Текстура с крупным знаком по центру: буква на карточке без картинки, «?» у заглушки,
// номер на плитке старта. Рисуется на canvas, без шрифтов из сети (drei Text грузит
// шрифт с CDN). round — круглый фон вместо квадратного.
export function useLabelTexture(
  text: string | null,
  background: string,
  round = false,
): CanvasTexture | null {
  const texture = useMemo(() => {
    if (text === null) return null;
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.fillStyle = background;
    if (round) {
      context.beginPath();
      context.arc(SIZE / 2, SIZE / 2, SIZE / 2 - 4, 0, Math.PI * 2);
      context.fill();
    } else {
      context.fillRect(0, 0, SIZE, SIZE);
    }
    context.fillStyle = '#fff';
    context.font = `bold ${text.length > 1 ? 64 : 80}px sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, SIZE / 2, SIZE / 2 + 4);
    const result = new CanvasTexture(canvas);
    result.colorSpace = SRGBColorSpace;
    return result;
  }, [text, background, round]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}
