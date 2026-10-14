import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  defaultItemThumbCrop,
  ITEM_THUMB_SIDE,
  itemThumbCropError,
  renderItemThumb,
} from './item-thumb.js';

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

describe('defaultItemThumbCrop', () => {
  it('вписывает длинную картинку целиком, по центру', () => {
    expect(defaultItemThumbCrop(800, 200)).toEqual({
      x: 0,
      y: -300,
      size: 800,
    });
    expect(defaultItemThumbCrop(300, 300)).toEqual({ x: 0, y: 0, size: 300 });
  });
});

describe('itemThumbCropError', () => {
  it('принимает вырез, выходящий за края', () => {
    expect(itemThumbCropError({ x: -50, y: -300, size: 900 }, 800, 200)).toBe(
      null,
    );
  });

  it('отклоняет вырез мимо картинки и слишком большой', () => {
    expect(itemThumbCropError({ x: 800, y: 0, size: 100 }, 800, 200)).toBe(
      'Миниатюра не задевает картинку',
    );
    expect(itemThumbCropError({ x: -100, y: -100, size: 100 }, 800, 200)).toBe(
      'Миниатюра не задевает картинку',
    );
    expect(itemThumbCropError({ x: 0, y: 0, size: 1601 }, 800, 200)).toBe(
      'Миниатюра слишком большая для этой картинки',
    );
    expect(itemThumbCropError({ x: 0, y: 0, size: 0 }, 800, 200)).toBe(
      'Миниатюра не может быть пустой',
    );
  });
});

describe('renderItemThumb', () => {
  it('оставляет поля вокруг широкой картинки прозрачными', async () => {
    const full = await solid(800, 200);
    const thumb = await renderItemThumb(
      full,
      800,
      200,
      defaultItemThumbCrop(800, 200),
    );
    const meta = await sharp(thumb).metadata();
    expect(meta).toMatchObject({
      format: 'webp',
      width: ITEM_THUMB_SIDE,
      height: ITEM_THUMB_SIDE,
    });
    expect(await alphaAt(thumb, 2, 2)).toBe(0);
    expect(await alphaAt(thumb, 128, 128)).toBe(255);
  });

  it('рендерит вырез внутри картинки без полей', async () => {
    const thumb = await renderItemThumb(await solid(800, 200), 800, 200, {
      x: 100,
      y: 0,
      size: 200,
    });
    expect(await alphaAt(thumb, 2, 2)).toBe(255);
  });
});
