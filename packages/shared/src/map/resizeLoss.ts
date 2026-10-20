import type { Vec3 } from './coords.js';
import type { SizedMapState } from './mapSize.js';
import {
  resizedSize,
  resizeFate,
  resizeShift,
  type ResizeOp,
} from './resizeOp.js';
import { solidCells } from './summary.js';
import type { MapObjects } from './objects/mapObject.js';
import { emptyObjectRefs, type ObjectRefs } from './objects/objectRefs.js';
import { objectResizeFate } from './objects/resizeObjects.js';

export interface ResizeLoss {
  // Срезано с запада, севера или снизу — удалится при любом cut.
  cut: number;
  // Окажется за восточной или южной границей, в том числе скрытое прежними сужениями:
  // при cut «keep» скроется, при «delete» удалится.
  outside: number;
  // Самый высокий уровень, где окажется оставшийся блок; null — блоков не останется.
  // Не меньше предела высоты — resize отклонят.
  top: number | null;
  // Объекты — по тому же правилу, отдельным счётом: диалог называет их отдельно.
  objectsCut: number;
  objectsOutside: number;
}

// Что resize сделает с блоками, без самой правки: диалог размера предупреждает о
// потерях до «Применить». Правило то же, что у applyResize (resizeFate).
export function resizeLoss(
  map: SizedMapState & { objects?: MapObjects },
  { grow, cut }: Pick<ResizeOp, 'grow' | 'cut'>,
  refs: ObjectRefs = emptyObjectRefs(),
): ResizeLoss {
  const after = resizedSize(map.size, grow);
  const shift = resizeShift(grow);
  const loss: ResizeLoss = {
    cut: 0,
    outside: 0,
    top: null,
    objectsCut: 0,
    objectsOutside: 0,
  };
  for (const { cell } of solidCells(map.store)) {
    const at: Vec3 = [
      cell[0] + shift[0],
      cell[1] + shift[1],
      cell[2] + shift[2],
    ];
    const fate = resizeFate(at, after);
    if (fate === 'cut') loss.cut++;
    if (fate === 'outside') loss.outside++;
    const kept = fate === 'inside' || (fate === 'outside' && cut !== 'delete');
    if (kept) loss.top = Math.max(loss.top ?? 0, at[1]);
  }
  for (const object of map.objects?.byId.values() ?? []) {
    const { fate } = objectResizeFate(object, shift, after, refs);
    if (fate === 'cut') loss.objectsCut++;
    if (fate === 'outside') loss.objectsOutside++;
  }
  return loss;
}
