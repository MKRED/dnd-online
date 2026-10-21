import type { CreatureHealth, HealthMarkStyle } from 'shared';

// Три вида метки здоровья (настройка пользователя healthMarkStyle): сцена делает из
// холста текстуру (MapScene/objects/HealthMark), профиль — превью. Без three, поэтому
// лежит вне лениво загружаемой сцены. Размеры — в
// условных пикселях метки высотой около 30; на canvas всё рисуется в SCALE раз крупнее,
// чтобы вблизи буквы оставались чёткими. Подпись — прописными, вразрядку.
const SCALE = 4;

// Цвет состояния: «Ранен» — кровь, на нуле — кость, «Погиб» — пепел. Глубокий —
// заливка ленты под светлым текстом.
const TONE: Record<CreatureHealth, string> = {
  bloodied: '#ff5a4a',
  down: '#e6dccb',
  dead: '#9aa0a6',
};
const DEEP: Record<CreatureHealth, string> = {
  bloodied: '#7a1510',
  down: '#3a342c',
  dead: '#1b1d20',
};

// Шрифты приложения (index.html): заголовочный Unbounded и Golos Text.
export const MARK_FONTS: Record<HealthMarkStyle, string> = {
  text: '600 22px "Unbounded", "Segoe UI", sans-serif',
  plate: '700 17px "Golos Text", system-ui, sans-serif',
  ribbon: '700 16px "Golos Text", system-ui, sans-serif',
};
const SPACING: Record<HealthMarkStyle, number> = {
  text: 2,
  plate: 2.5,
  ribbon: 2,
};

type Ctx = CanvasRenderingContext2D;

// Холст под метку: ширина по тексту и полям, высота своя у каждого вида.
function sheet(
  style: HealthMarkStyle,
  label: string,
  padX: number,
  height: number,
): { canvas: HTMLCanvasElement; ctx: Ctx; w: number } | null {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const font = () => {
    ctx.font = MARK_FONTS[style];
    ctx.letterSpacing = `${SPACING[style]}px`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
  };
  font();
  const w = Math.ceil(ctx.measureText(label).width) + padX * 2;
  canvas.width = w * SCALE;
  canvas.height = height * SCALE;
  // Новый размер холста сбрасывает контекст — настройки заново.
  ctx.scale(SCALE, SCALE);
  font();
  return { canvas, ctx, w };
}

// Только надпись с тёмной обводкой, как имена над героями в играх.
function drawText(label: string, health: CreatureHealth) {
  const s = sheet('text', label, 6, 34);
  if (!s) return null;
  const { ctx, w } = s;
  ctx.lineJoin = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = 'rgba(10,8,6,0.9)';
  ctx.strokeText(label, w / 2, 17);
  ctx.fillStyle = TONE[health];
  ctx.fillText(label, w / 2, 17);
  return s.canvas;
}

// Тёмная табличка с тонкой рамкой и ромбами цвета состояния.
function drawPlate(label: string, health: CreatureHealth) {
  const h = 30;
  const s = sheet('plate', label, 22, h);
  if (!s) return null;
  const { ctx, w } = s;
  const y = h / 2;
  ctx.fillStyle = 'rgba(18,15,12,0.86)';
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, 4);
  ctx.fill();
  ctx.strokeStyle = TONE[health];
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(3, 3, w - 6, h - 6, 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = TONE[health];
  for (const side of [-1, 1]) {
    const cx = w / 2 + side * (w / 2 - 13);
    ctx.beginPath();
    ctx.moveTo(cx, y - 4);
    ctx.lineTo(cx + 4, y);
    ctx.lineTo(cx, y + 4);
    ctx.lineTo(cx - 4, y);
    ctx.fill();
  }
  ctx.fillText(label, w / 2, y + 1);
  return s.canvas;
}

// Лента с вырезами на концах, светлый текст.
function drawRibbon(label: string, health: CreatureHealth) {
  const h = 28;
  const notch = 9;
  const s = sheet('ribbon', label, 20, h);
  if (!s) return null;
  const { ctx, w } = s;
  const y = h / 2;
  ctx.fillStyle = DEEP[health];
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(w - notch, y);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.lineTo(notch, y);
  ctx.closePath();
  ctx.fill();
  // Строчка по краям ленты.
  ctx.strokeStyle = 'rgba(255,240,210,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(notch + 2, 3);
  ctx.lineTo(w - notch - 2, 3);
  ctx.moveTo(notch + 2, h - 3);
  ctx.lineTo(w - notch - 2, h - 3);
  ctx.stroke();
  ctx.fillStyle = '#f3eadb';
  ctx.fillText(label, w / 2, y + 1);
  return s.canvas;
}

const DRAW: Record<
  HealthMarkStyle,
  (label: string, health: CreatureHealth) => HTMLCanvasElement | null
> = { text: drawText, plate: drawPlate, ribbon: drawRibbon };

// Холст метки в выбранном виде; null — нет 2D-контекста.
export function drawHealthMark(
  style: HealthMarkStyle,
  label: string,
  health: CreatureHealth,
): HTMLCanvasElement | null {
  return DRAW[style](label.toLocaleUpperCase('ru'), health);
}
