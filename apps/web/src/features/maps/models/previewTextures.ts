import { CanvasTexture, Shape, ShapeGeometry, SRGBColorSpace } from 'three';

// Пикселей на фут: доска в клетку шириной — 5 футов, 320 пикселей.
const PX_PER_FOOT = 64;
// Поле над верхней линией, в футах: там её подпись.
export const LINEUP_TOP_FEET = 0.7;
// Без заливки, линии средним тоном: доска не перетягивает взгляд с модели и видна и на
// светлой, и на тёмной странице. Линия клетки с подписью — плотнее.
const LINE = 'rgba(154, 143, 128, 0.55)';
const MAJOR = 'rgba(154, 143, 128, 0.9)';

// Ростовая доска, как на снимке задержанного: линия через каждый фут и линия плотнее,
// с подписью, через каждые 5 футов (клетку). Высота — feet футов и поле
// над верхней линией, ширина — одна клетка. Рисуется в canvas один раз на высоту.
export function lineupTexture(feet: number): CanvasTexture {
  const width = 5 * PX_PER_FOOT;
  const height = Math.round((feet + LINEUP_TOP_FEET) * PX_PER_FOOT);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D недоступен');
  ctx.textBaseline = 'bottom';
  for (let foot = 1; foot <= feet; foot++) {
    // y — от верха canvas: фут 0 — у пола, внизу.
    const y = height - foot * PX_PER_FOOT;
    const major = foot % 5 === 0;
    ctx.fillStyle = major ? MAJOR : LINE;
    ctx.fillRect(0, y - (major ? 2 : 1), width, major ? 4 : 2);
    if (major) {
      ctx.font = '700 30px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${foot} фт`, 12, y - 6);
      ctx.textAlign = 'right';
      ctx.fillText(`${foot} фт`, width - 12, y - 6);
    } else {
      ctx.font = '500 22px system-ui, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(String(foot), 12, y - 4);
      ctx.textAlign = 'right';
      ctx.fillText(String(foot), width - 12, y - 4);
    }
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Стрелка взгляда на полу перед клеткой: от края места к −z (туда смотрит фигурка с
// взглядом «север»), широким наконечником. В плоскости XY — кладётся поворотом на пол.
export function facingArrowGeometry(): ShapeGeometry {
  const shape = new Shape();
  // y здесь — будущая −z: стрелка растёт от края клетки (0.56) наружу.
  shape.moveTo(-0.07, 0.56);
  shape.lineTo(0.07, 0.56);
  shape.lineTo(0.07, 0.74);
  shape.lineTo(0.2, 0.74);
  shape.lineTo(0, 0.98);
  shape.lineTo(-0.2, 0.74);
  shape.lineTo(-0.07, 0.74);
  shape.closePath();
  return new ShapeGeometry(shape);
}
