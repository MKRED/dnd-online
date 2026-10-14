import type { ThumbCrop } from './images.js';

// Вырез миниатюры предмета — общие правила для формы и сервера: форма проверяет вырез
// до отправки, сервер проверяет сам. В отличие от персонажа, вырез может выходить за
// края картинки: поля миниатюры прозрачные.

// Насколько вырез может быть больше картинки: дальше сама картинка в миниатюре
// превращается в точку.
export const ITEM_THUMB_MAX_CROP_TO_IMAGE = 2;

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

// Текст ошибки для выреза; null — вырез годится. Вырез должен задевать картинку и не
// быть слишком большим.
export function itemThumbCropError(
  crop: ThumbCrop,
  width: number,
  height: number,
): string | null {
  if (crop.size < 1) return 'Миниатюра не может быть пустой';
  if (crop.size > ITEM_THUMB_MAX_CROP_TO_IMAGE * Math.max(width, height)) {
    return 'Миниатюра слишком большая для этой картинки';
  }
  const overlaps =
    crop.x < width &&
    crop.y < height &&
    crop.x + crop.size > 0 &&
    crop.y + crop.size > 0;
  return overlaps ? null : 'Миниатюра не задевает картинку';
}
