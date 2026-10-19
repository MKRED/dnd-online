import { applyOp } from './applyOp.js';
import type { Changeset } from './changeset.js';
import { mergeChangesets } from './changesetMerge.js';
import { boxVolume } from './coords.js';
import type { MapState } from './mapState.js';
import {
  isBlockOp,
  MapOpError,
  opRegion,
  parseMapOp,
  type BlockOp,
  type MapLimits,
  type MapOp,
} from './ops.js';

export interface MapBatchLimits extends MapLimits {
  maxOpsPerBatch: number;
  // Суммарный объём пачки: иначе 100 операций по пределу дали бы многомегабайтный
  // changeset в одной транзакции.
  maxBatchVolume: number;
}

// Пачка разбирается целиком до применения: ошибка в любой операции отклоняет всю
// пачку, и карта не остаётся «наполовину построенной».
export function parseMapOpBatch(
  input: unknown,
  limits: MapBatchLimits,
): MapOp[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new MapOpError('Нужен непустой список операций');
  }
  if (input.length > limits.maxOpsPerBatch) {
    throw new MapOpError(
      `В пачке ${input.length} операций, максимум — ${limits.maxOpsPerBatch}`,
    );
  }
  const ops = input.map((item, index) =>
    numbered(index, () => parseMapOp(item, limits)),
  );
  const volume = ops
    .filter(isBlockOp)
    .reduce((sum, op) => sum + boxVolume(opRegion(op)), 0);
  if (volume > limits.maxBatchVolume) {
    throw new MapOpError(
      `Пачка затрагивает ${volume} клеток, максимум — ${limits.maxBatchVolume}`,
    );
  }
  return ops;
}

// Ошибка операции из пачки называет её номер: в пачке их может быть сотня.
export function numbered<T>(index: number, run: () => T): T {
  try {
    return run();
  } catch (err) {
    if (err instanceof MapOpError) {
      throw new MapOpError(`Операция №${index + 1}: ${err.message}`);
    }
    throw err;
  }
}

// Применяет пачку операций над блоками как одну единицу undo, не глядя на размер
// карты: так строятся карты в тестах и правилах. Настоящую карту правит editMap.
export function applyOps(state: MapState, ops: BlockOp[]): Changeset {
  return mergeChangesets(ops.map((op) => applyOp(state, op)));
}
