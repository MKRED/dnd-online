import type { Vec3 } from './coords.js';
import type { SizedMapState } from './mapSize.js';
import {
  resizedSize,
  resizeFate,
  resizeShift,
  type ResizeOp,
} from './resizeOp.js';
import { solidCells } from './summary.js';

export interface ResizeLoss {
  // Срезано с запада, севера или снизу — удалится при любом cut.
  cut: number;
  // Окажется за восточной или южной границей, в том числе скрытое прежними сужениями:
  // при cut «keep» скроется, при «delete» удалится.
  outside: number;
  // Самый высокий уровень, где окажется оставшийся блок; null — блоков не останется.
  // Не меньше предела высоты — resize отклонят.
  top: number | null;
}

// Что resize сделает с блоками, без самой правки: диалог размера предупреждает о
// потерях до «Применить». Правило то же, что у applyResize (resizeFate).
export function resizeLoss(
  map: SizedMapState,
  { grow, cut }: Pick<ResizeOp, 'grow' | 'cut'>,
): ResizeLoss {
  const after = resizedSize(map.size, grow);
  const shift = resizeShift(grow);
  const loss: ResizeLoss = { cut: 0, outside: 0, top: null };
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
  return loss;
}
