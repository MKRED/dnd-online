import type { ThumbCrop } from 'shared';

// Насколько вырез по умолчанию сдвинут от верха у вертикальной картинки (доля свободного
// хода): у портрета в рост лицо вверху, по центру оказался бы живот.
const PORTRAIT_TOP_OFFSET = 0.15;

// Вырез миниатюры, пока пользователь не выбрал свой: наибольший квадрат по центру.
// «Умный» вырез sharp не годится — он не сообщает, какой прямоугольник выбрал, и
// редактор миниатюры открылся бы не на том месте.
export function defaultThumbCrop(width: number, height: number): ThumbCrop {
  const size = Math.min(width, height);
  return {
    x: Math.floor((width - size) / 2),
    y: Math.floor((height - size) * PORTRAIT_TOP_OFFSET),
    size,
  };
}

// Текст ошибки, если вырез не помещается в картинку; null — вырез годится.
export function thumbCropError(
  crop: ThumbCrop,
  width: number,
  height: number,
): string | null {
  const fits =
    crop.x + crop.size <= width &&
    crop.y + crop.size <= height &&
    crop.size > 0;
  return fits ? null : 'Миниатюра выходит за края картинки';
}
