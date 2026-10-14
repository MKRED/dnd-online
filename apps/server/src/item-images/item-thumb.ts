import sharp from 'sharp';
import type { ThumbCrop } from 'shared';

// Вырез по умолчанию и его проверка — в shared (itemThumbCrop.ts): их же использует форма.
export const ITEM_THUMB_SIDE = 256;

// Миниатюра из варианта full; вырез должен быть уже проверен (itemThumbCropError).
// sharp не накладывает картинку больше холста, а холст размером с вырез мог бы занять
// десятки мегабайт. Поэтому вырезаем пересечение выреза с картинкой, сразу уменьшаем
// его в масштабе миниатюры и кладём на прозрачный холст 256×256.
export async function renderItemThumb(
  full: Buffer,
  width: number,
  height: number,
  crop: ThumbCrop,
): Promise<Buffer> {
  const scale = ITEM_THUMB_SIDE / crop.size;
  const left = Math.max(0, crop.x);
  const top = Math.max(0, crop.y);
  const right = Math.min(width, crop.x + crop.size);
  const bottom = Math.min(height, crop.y + crop.size);
  // Округление может вытолкнуть наложение за край холста на пиксель — прижимаем.
  const offsetX = Math.min(
    ITEM_THUMB_SIDE - 1,
    Math.round((left - crop.x) * scale),
  );
  const offsetY = Math.min(
    ITEM_THUMB_SIDE - 1,
    Math.round((top - crop.y) * scale),
  );
  const overlayWidth = Math.max(
    1,
    Math.min(ITEM_THUMB_SIDE - offsetX, Math.round((right - left) * scale)),
  );
  const overlayHeight = Math.max(
    1,
    Math.min(ITEM_THUMB_SIDE - offsetY, Math.round((bottom - top) * scale)),
  );
  const overlay = await sharp(full)
    .extract({ left, top, width: right - left, height: bottom - top })
    .resize({ width: overlayWidth, height: overlayHeight, fit: 'fill' })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: ITEM_THUMB_SIDE,
      height: ITEM_THUMB_SIDE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: overlay, left: offsetX, top: offsetY }])
    .webp({ quality: 82 })
    .toBuffer();
}
