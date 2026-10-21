// Размер метки на экране. Метка — объект сцены и уменьшается с камерой, как всё вокруг,
// но вблизи не раздувается: плашка над существом нужна, чтобы прочесть, а не заслонить.
// Совсем мелкую не показываем — такую не прочесть, а пятна над каждой крысой мешают.

// Высота метки — доля клетки, но на экране в пределах от MIN до MAX пикселей: мельче
// не прочесть, крупнее — заслоняет. Клетка мельче HIDE_CELL_PX — камера далеко, метки
// прячутся совсем.
export const MARK_HEIGHT_CELLS = 0.45;
export const MARK_MIN_PX = 13;
export const MARK_MAX_PX = 24;
export const HIDE_CELL_PX = 18;

// Высота метки в клетках мира при клетке в cellPx пикселей там, где метка; null — не
// показывать.
export function markHeightCells(cellPx: number): number | null {
  if (!(cellPx >= HIDE_CELL_PX)) return null;
  const px = Math.min(
    Math.max(cellPx * MARK_HEIGHT_CELLS, MARK_MIN_PX),
    MARK_MAX_PX,
  );
  return px / cellPx;
}
