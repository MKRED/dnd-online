import { applyOp } from './applyOp.js';
import type { CellChange, Changeset } from './changeset.js';
import { boxVolume, type Vec3 } from './coords.js';
import type { MapState } from './mapState.js';
import {
  MapOpError,
  opRegion,
  parseMapOp,
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
  const ops = input.map((item, index) => {
    try {
      return parseMapOp(item, limits);
    } catch (err) {
      if (err instanceof MapOpError) {
        throw new MapOpError(`Операция №${index + 1}: ${err.message}`);
      }
      throw err;
    }
  });
  const volume = ops.reduce((sum, op) => sum + boxVolume(opRegion(op)), 0);
  if (volume > limits.maxBatchVolume) {
    throw new MapOpError(
      `Пачка затрагивает ${volume} клеток, максимум — ${limits.maxBatchVolume}`,
    );
  }
  return ops;
}

// Применяет пачку как одну единицу undo: по каждой клетке остаётся первое «до» и
// последнее «после», клетки, вернувшиеся к исходному значению, выпадают.
export function applyOps(state: MapState, ops: MapOp[]): Changeset {
  const merged = new Map<string, CellChange>();
  const paletteAdded: Changeset['paletteAdded'] = [];
  for (const op of ops) {
    const changes = applyOp(state, op);
    paletteAdded.push(...changes.paletteAdded);
    for (const change of changes.cells) {
      const id = cellId(change.at);
      const previous = merged.get(id);
      merged.set(id, previous ? { ...previous, after: change.after } : change);
    }
  }
  const cells = [...merged.values()].filter((c) => c.before !== c.after);
  return { cells, paletteAdded };
}

function cellId([x, y, z]: Vec3): string {
  return `${x},${y},${z}`;
}
