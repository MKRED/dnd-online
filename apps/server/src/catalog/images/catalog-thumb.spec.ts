import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { defaultCatalogThumbCrop } from 'shared';
import { CATALOG_THUMB_SIDE, renderCatalogThumb } from './catalog-thumb.js';

// Непрозрачная картинка, нарисованная самим sharp: файлов-фикстур в репозитории нет.
function solid(width: number, height: number) {
  return sharp({
    create: { width, height, channels: 3, background: '#804020' },
  })
    .webp()
    .toBuffer();
}

// Прозрачность пикселя миниатюры (0 — пусто, 255 — непрозрачно).
async function alphaAt(thumb: Buffer, x: number, y: number) {
  const { data, info } = await sharp(thumb)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  return data[(y * info.width + x) * info.channels + 3];
}

describe('renderCatalogThumb', () => {
  it('оставляет поля вокруг широкой картинки прозрачными', async () => {
    const full = await solid(800, 200);
    const thumb = await renderCatalogThumb(
      full,
      800,
      200,
      defaultCatalogThumbCrop(800, 200),
    );
    const meta = await sharp(thumb).metadata();
    expect(meta).toMatchObject({
      format: 'webp',
      width: CATALOG_THUMB_SIDE,
      height: CATALOG_THUMB_SIDE,
    });
    expect(await alphaAt(thumb, 2, 2)).toBe(0);
    expect(await alphaAt(thumb, 128, 128)).toBe(255);
  });

  it('рендерит вырез внутри картинки без полей', async () => {
    const thumb = await renderCatalogThumb(await solid(800, 200), 800, 200, {
      x: 100,
      y: 0,
      size: 200,
    });
    expect(await alphaAt(thumb, 2, 2)).toBe(255);
  });
});
