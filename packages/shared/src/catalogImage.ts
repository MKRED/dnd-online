import type { ThumbCrop } from './images.js';

// Картинка записи каталога (предмета, способности, эффекта) — одна, в двух вариантах
// WebP: full — для просмотра, thumb — квадрат 256×256 для карточки. Правила выреза
// миниатюры общие для формы и сервера: форма проверяет вырез до отправки, сервер
// проверяет сам. В отличие от персонажа, вырез может выходить за края картинки: поля
// миниатюры прозрачные, так длинный меч вписывается целиком.
export const CATALOG_IMAGE_VARIANTS = ['full', 'thumb'] as const;
export type CatalogImageVariant = (typeof CATALOG_IMAGE_VARIANTS)[number];

export interface CatalogImage {
  // Растёт при замене картинки и смене выреза: идёт в адрес обоих вариантов, чтобы
  // браузер не показал старую из кеша.
  version: number;
  // Размеры варианта full.
  width: number;
  height: number;
  thumbCrop: ThumbCrop;
}

// Насколько вырез может быть больше картинки: дальше сама картинка в миниатюре
// превращается в точку.
export const CATALOG_THUMB_MAX_CROP_TO_IMAGE = 2;

// Вырез по умолчанию — картинка целиком, вписанная в квадрат по центру. Квадрат по
// короткой стороне (как у персонажа) отрезал бы концы длинному мечу или посоху.
export function defaultCatalogThumbCrop(
  width: number,
  height: number,
): ThumbCrop {
  const size = Math.max(width, height);
  return {
    x: Math.floor((width - size) / 2),
    y: Math.floor((height - size) / 2),
    size,
  };
}

// Текст ошибки для выреза; null — вырез годится. Вырез должен задевать картинку и не
// быть слишком большим.
export function catalogThumbCropError(
  crop: ThumbCrop,
  width: number,
  height: number,
): string | null {
  if (crop.size < 1) return 'Миниатюра не может быть пустой';
  if (crop.size > CATALOG_THUMB_MAX_CROP_TO_IMAGE * Math.max(width, height)) {
    return 'Миниатюра слишком большая для этой картинки';
  }
  const overlaps =
    crop.x < width &&
    crop.y < height &&
    crop.x + crop.size > 0 &&
    crop.y + crop.size > 0;
  return overlaps ? null : 'Миниатюра не задевает картинку';
}
