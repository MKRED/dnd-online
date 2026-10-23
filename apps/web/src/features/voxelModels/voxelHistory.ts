import type { VoxelGrid } from './voxelGrid';

// Шаг отмены: мазок — разница по вокселям (что было и что стало в этих индексах), а
// размер, поворот и свойства клеток — сетка до и после целиком. Палитра только растёт,
// поэтому её отменять не нужно: лишние цвета уходят при сохранении.
export type VoxelStep =
  | { kind: 'voxels'; indices: number[]; before: Uint8Array; after: Uint8Array }
  | { kind: 'grid'; before: VoxelGrid; after: VoxelGrid };

export interface VoxelHistory {
  past: VoxelStep[];
  future: VoxelStep[];
}

export const HISTORY_LIMIT = 100;

export const emptyHistory = (): VoxelHistory => ({ past: [], future: [] });

export function pushStep(history: VoxelHistory, step: VoxelStep): VoxelHistory {
  return { past: [...history.past, step].slice(-HISTORY_LIMIT), future: [] };
}

// Применяет шаг к сетке в нужную сторону и отдаёт сетку, которая теперь в работе.
export function applyStep(
  grid: VoxelGrid,
  step: VoxelStep,
  direction: 'undo' | 'redo',
): VoxelGrid {
  if (step.kind === 'grid')
    return direction === 'undo' ? step.before : step.after;
  const values = direction === 'undo' ? step.before : step.after;
  step.indices.forEach((index, i) => (grid.voxels[index] = values[i]));
  return grid;
}
