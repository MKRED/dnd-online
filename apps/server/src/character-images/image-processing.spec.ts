import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import {
  processUpload,
  renderThumb,
  THUMB_SIDE,
  UnsupportedImageError,
} from './image-processing.js';

// Тестовые картинки рисуем самим sharp: файлов-фикстур в репозитории нет.
function solid(width: number, height: number, background = '#804020') {
  return sharp({ create: { width, height, channels: 3, background } });
}

describe('processUpload', () => {
  it('перекодирует картинку в три варианта WebP', async () => {
    const image = await processUpload(await solid(600, 900).png().toBuffer());
    expect(image).toMatchObject({ width: 600, height: 900 });
    const [full, preview, thumb] = await Promise.all(
      [image.full, image.preview, image.thumb].map((data) =>
        sharp(data).metadata(),
      ),
    );
    expect(full).toMatchObject({ format: 'webp', width: 600, height: 900 });
    expect(preview).toMatchObject({ format: 'webp', width: 320, height: 480 });
    expect(thumb).toMatchObject({
      format: 'webp',
      width: THUMB_SIDE,
      height: THUMB_SIDE,
    });
  });

  it('вписывает большую картинку в 2048 пикселей', async () => {
    const image = await processUpload(
      await solid(4096, 1024).jpeg().toBuffer(),
    );
    expect(image).toMatchObject({ width: 2048, height: 512 });
    expect(image.thumbCrop).toEqual({ x: 768, y: 0, size: 512 });
  });

  it('поворачивает по EXIF и выбрасывает метаданные', async () => {
    const source = await solid(300, 100)
      .jpeg()
      .withMetadata({ orientation: 6 })
      .toBuffer();
    const image = await processUpload(source);
    // Ориентация 6 — поворот на 90°: стороны меняются местами.
    expect(image).toMatchObject({ width: 100, height: 300 });
    const metadata = await sharp(image.full).metadata();
    expect(metadata.orientation).toBeUndefined();
    expect(metadata.exif).toBeUndefined();
  });

  it('не принимает то, что не картинка', async () => {
    await expect(
      processUpload(Buffer.from('это не картинка')),
    ).rejects.toBeInstanceOf(UnsupportedImageError);
  });

  it('не принимает формат вне списка', async () => {
    const gif = await solid(10, 10).gif().toBuffer();
    await expect(processUpload(gif)).rejects.toBeInstanceOf(
      UnsupportedImageError,
    );
  });
});

describe('renderThumb', () => {
  it('вырезает заданный квадрат', async () => {
    // Левая половина красная, правая синяя: по цвету видно, что вырезано.
    const full = await solid(200, 100, '#ff0000')
      .composite([
        {
          input: await solid(100, 100, '#0000ff').png().toBuffer(),
          left: 100,
          top: 0,
        },
      ])
      .webp({ lossless: true })
      .toBuffer();
    const thumb = await renderThumb(full, { x: 100, y: 0, size: 100 });
    const { dominant } = await sharp(thumb).stats();
    expect(dominant.b).toBeGreaterThan(200);
    expect(dominant.r).toBeLessThan(50);
  });
});
