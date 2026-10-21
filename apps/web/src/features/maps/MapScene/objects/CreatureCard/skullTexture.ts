import { CanvasTexture, SRGBColorSpace } from 'three';

// Череп на крышке гроба: портрет существа остаётся только у призрака над гробом.
// Рисуется на canvas один раз на страницу — у всех гробов он одинаковый. Цвет кости
// приглушён, тени — цвета крышки: череп выглядит вырезанным в дереве, а не наклейкой.
const SIZE = 256;
const BONE = '#d8ccb0';
const SHADE = '#4a3020';

let texture: CanvasTexture | null | undefined;

function drawSkull(): CanvasTexture | null {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SIZE / 100, SIZE / 100);
  // Тень под черепом — резьба углублена в крышку.
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 3;
  ctx.shadowOffsetY = 1.5;
  ctx.fillStyle = BONE;
  // Свод и скулы.
  ctx.beginPath();
  ctx.ellipse(50, 42, 30, 29, 0, Math.PI * 0.86, Math.PI * 2.14);
  ctx.quadraticCurveTo(76, 66, 66, 70);
  ctx.lineTo(34, 70);
  ctx.quadraticCurveTo(24, 66, 24, 57);
  ctx.closePath();
  ctx.fill();
  // Челюсть.
  ctx.beginPath();
  ctx.roundRect(36, 66, 28, 18, [2, 2, 7, 7]);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.fillStyle = SHADE;
  // Глазницы.
  for (const x of [38, 62]) {
    ctx.beginPath();
    ctx.ellipse(x, 48, 8.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // Нос.
  ctx.beginPath();
  ctx.moveTo(50, 58);
  ctx.lineTo(45.5, 66);
  ctx.lineTo(54.5, 66);
  ctx.closePath();
  ctx.fill();
  // Зубы — прорези в челюсти.
  ctx.fillRect(36, 74, 28, 1.6);
  for (const x of [43, 50, 57]) ctx.fillRect(x - 0.8, 68, 1.6, 15);
  const result = new CanvasTexture(canvas);
  result.colorSpace = SRGBColorSpace;
  return result;
}

export function skullTexture(): CanvasTexture | null {
  if (texture === undefined) texture = drawSkull();
  return texture;
}
