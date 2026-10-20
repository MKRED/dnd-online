import {
  RESIZE_SIDES,
  resizedSize,
  resizeLoss,
  type MapBoundsLimits,
  type MapObjects,
  type ObjectRefs,
  type ResizeCut,
  type ResizeOp,
  type ResizeSide,
  type SizedMapState,
} from 'shared';

// Набираемое в панели изменение размера: по числу на сторону и что делать со срезанным.
export interface ResizeDraft {
  grow: Record<ResizeSide, number>;
  cut: ResizeCut;
}

export const EMPTY_DRAFT: ResizeDraft = {
  grow: { north: 0, south: 0, west: 0, east: 0, down: 0 },
  cut: 'keep',
};

export interface DraftCheck {
  after: { width: number; depth: number };
  // Что станет с блоками и объектами (см. resizeLoss): за восточной и южной границей.
  outside: number;
  objectsOutside: number;
  // Удалится при выбранном cut: срезанное плюс, при «delete», то, что за границей.
  removed: number;
  objectsRemoved: number;
  // Почему нельзя применить; null — можно.
  error: string | null;
  unchanged: boolean;
}

// Проверка до отправки — те же правила, что у applyResize; сервер всё равно проверит
// сам, но так ошибка видна сразу, а не после «Применить».
// refs — размеры монстров: место Большого может уйти за границу целиком или частью.
export function checkDraft(
  state: SizedMapState & { objects?: MapObjects },
  draft: ResizeDraft,
  limits: MapBoundsLimits,
  refs?: ObjectRefs,
): DraftCheck {
  const after = resizedSize(state.size, draft.grow);
  const loss = resizeLoss(state, draft, refs);
  const deleting = draft.cut === 'delete';
  const removed = loss.cut + (deleting ? loss.outside : 0);
  const objectsRemoved = loss.objectsCut + (deleting ? loss.objectsOutside : 0);
  const unchanged = RESIZE_SIDES.every((side) => draft.grow[side] === 0);
  let error: string | null = null;
  if (after.width < 1 || after.depth < 1) {
    error = 'Нужна хотя бы одна клетка в ширину и в глубину';
  } else if (after.width > limits.maxSize || after.depth > limits.maxSize) {
    error = `Больше предела ${limits.maxSize} × ${limits.maxSize} клеток`;
  } else if (loss.top !== null && loss.top >= limits.maxHeight) {
    error = `Блоки поднимутся выше предела высоты: ${limits.maxHeight} уровней`;
  }
  return {
    after,
    outside: loss.outside,
    objectsOutside: loss.objectsOutside,
    removed,
    objectsRemoved,
    error,
    unchanged,
  };
}

// «блоков: 12, объектов: 2» — без нулевых частей.
export function lossLabel(blocks: number, objects: number): string {
  return [
    blocks > 0 && `блоков: ${blocks}`,
    objects > 0 && `объектов: ${objects}`,
  ]
    .filter(Boolean)
    .join(', ');
}

// Операция для сервера: только ненулевые стороны, cut — если с востока или юга есть что
// срезать, блоки или объекты (outside — их сумма).
export function draftOp(draft: ResizeDraft, outside: number): ResizeOp {
  const grow: ResizeOp['grow'] = {};
  for (const side of RESIZE_SIDES) {
    if (draft.grow[side] !== 0) grow[side] = draft.grow[side];
  }
  return {
    op: 'resize',
    grow,
    ...(outside > 0 && { cut: draft.cut }),
  };
}
