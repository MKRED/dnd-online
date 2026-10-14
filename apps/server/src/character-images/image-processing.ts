import sharp from 'sharp';
import type { ThumbCrop } from 'shared';
import { decodeToFull } from '../images/decode-image.js';
import { defaultThumbCrop } from './thumb-crop.js';

export { UnsupportedImageError } from '../images/decode-image.js';

const PREVIEW_MAX_SIDE = 480;
export const THUMB_SIDE = 256;

export interface ProcessedImage {
  width: number;
  height: number;
  thumbCrop: ThumbCrop;
  full: Buffer;
  preview: Buffer;
  thumb: Buffer;
}

// Картинка персонажа: full из общего ядра (decodeToFull — проверка формата, поворот,
// без метаданных) плюс preview для сетки галереи и вырез-миниатюра.
export async function processUpload(input: Buffer): Promise<ProcessedImage> {
  const full = await decodeToFull(input);
  const preview = await sharp(full.data)
    .resize({
      width: PREVIEW_MAX_SIDE,
      height: PREVIEW_MAX_SIDE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 80 })
    .toBuffer();
  const { width, height } = full;
  const thumbCrop = defaultThumbCrop(width, height);
  const thumb = await renderThumb(full.data, thumbCrop);
  return { width, height, thumbCrop, full: full.data, preview, thumb };
}

// Миниатюра — вырез из варианта full; вырез должен быть уже проверен (thumbCropError).
export function renderThumb(full: Buffer, crop: ThumbCrop): Promise<Buffer> {
  return sharp(full)
    .extract({ left: crop.x, top: crop.y, width: crop.size, height: crop.size })
    .resize({ width: THUMB_SIDE, height: THUMB_SIDE })
    .webp({ quality: 82 })
    .toBuffer();
}
