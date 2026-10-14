import sharp from 'sharp';
import type { ThumbCrop } from 'shared';
import { defaultThumbCrop } from './thumb-crop.js';

const FULL_MAX_SIDE = 2048;
const PREVIEW_MAX_SIDE = 480;
export const THUMB_SIDE = 256;
// Картинка в 10 МБ может распаковаться в гигабайты пикселей («бомба»). 50 Мп с запасом
// покрывают фото с телефона, остальное sharp отклонит, не декодируя.
const MAX_INPUT_PIXELS = 50_000_000;
const ACCEPTED_FORMATS = ['jpeg', 'png', 'webp'];

// Файл не картинка, повреждён или не того формата. Сервис превращает это в 400.
export class UnsupportedImageError extends Error {}

export interface ProcessedImage {
  width: number;
  height: number;
  thumbCrop: ThumbCrop;
  full: Buffer;
  preview: Buffer;
  thumb: Buffer;
}

// Загруженный файл как есть не храним: перекодируем в WebP трёх размеров. Заодно это
// проверка формата по содержимому (расширению и Content-Type верить нельзя), поворот
// по EXIF и удаление метаданных (в фото бывает геометка). Анимация не поддерживается:
// sharp по умолчанию берёт первый кадр.
export async function processUpload(input: Buffer): Promise<ProcessedImage> {
  try {
    const source = () => sharp(input, { limitInputPixels: MAX_INPUT_PIXELS });
    const { format } = await source().metadata();
    if (!format || !ACCEPTED_FORMATS.includes(format)) {
      throw new UnsupportedImageError(`Формат ${format ?? 'неизвестен'}`);
    }
    const full = await source()
      .autoOrient()
      .resize({
        width: FULL_MAX_SIDE,
        height: FULL_MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
    const preview = await sharp(full.data)
      .resize({
        width: PREVIEW_MAX_SIDE,
        height: PREVIEW_MAX_SIDE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 80 })
      .toBuffer();
    const { width, height } = full.info;
    const thumbCrop = defaultThumbCrop(width, height);
    const thumb = await renderThumb(full.data, thumbCrop);
    return { width, height, thumbCrop, full: full.data, preview, thumb };
  } catch (err: unknown) {
    if (err instanceof UnsupportedImageError) throw err;
    // sharp бросает обычный Error и на битый файл, и на превышение лимита пикселей.
    throw new UnsupportedImageError('Не удалось декодировать', { cause: err });
  }
}

// Миниатюра — вырез из варианта full; вырез должен быть уже проверен (thumbCropError).
export function renderThumb(full: Buffer, crop: ThumbCrop): Promise<Buffer> {
  return sharp(full)
    .extract({ left: crop.x, top: crop.y, width: crop.size, height: crop.size })
    .resize({ width: THUMB_SIDE, height: THUMB_SIDE })
    .webp({ quality: 82 })
    .toBuffer();
}
