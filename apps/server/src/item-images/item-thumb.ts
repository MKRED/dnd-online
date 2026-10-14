import sharp from 'sharp';
import type { ThumbCrop } from 'shared';

export const ITEM_THUMB_SIDE = 256;
// Насколько вырез может быть больше картинки: дальше сама картинка в миниатюре
// превращается в точку, а рендер тратит процессор зря.
const MAX_CROP_TO_IMAGE = 2;

// Вырез по умолчанию — картинка целиком, вписанная в квадрат по центру. Квадрат по
// короткой стороне (как у персонажа) отрезал бы концы длинному мечу или посоху.
export function defaultItemThumbCrop(width: number, height: number): ThumbCrop {
  const size = Math.max(width, height);
  return {
    x: Math.floor((width - size) / 2),
    y: Math.floor((height - size) / 2),
    size,
  };
}

// Текст ошибки для выреза; null — вырез годится. Вырез может выходить за края (поля
// будут прозрачными), но должен задевать картинку и не быть слишком большим.
export function itemThumbCropError(
  crop: ThumbCrop,
  width: number,
  height: number,
): string | null {
  if (crop.size < 1) return 'Миниатюра не может быть пустой';
  if (crop.size > MAX_CROP_TO_IMAGE * Math.max(width, height)) {
    return 'Миниатюра слишком большая для этой картинки';
  }
  const overlaps =
    crop.x < width &&
    crop.y < height &&
    crop.x + crop.size > 0 &&
    crop.y + crop.size > 0;
  return overlaps ? null : 'Миниатюра не задевает картинку';
}

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
