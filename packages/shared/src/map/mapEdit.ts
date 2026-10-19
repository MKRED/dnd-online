import { applyOp } from './applyOp.js';
import { applyResize } from './applyResize.js';
import type { Changeset } from './changeset.js';
import { mergeChangesets } from './changesetMerge.js';
import {
  assertInsideMap,
  type MapBoundsLimits,
  type SizedMapState,
} from './mapSize.js';
import { opRegion, type MapOp } from './ops.js';
import { numbered } from './opsBatch.js';

// Правка настоящей карты (сервер, под блокировкой карты): операции над блоками не
// выходят за её размер, resize меняет размер. Размер проверяется по ходу пачки:
// после resize следующая операция уже строит в новых границах. При ошибке карта в
// памяти остаётся изменённой наполовину — вызывающий её отбрасывает (откат транзакции).
export function editMap(
  map: SizedMapState,
  ops: MapOp[],
  limits: MapBoundsLimits,
): Changeset {
  const parts = ops.map((op, index) =>
    numbered(index, () => {
      if (op.op === 'resize') return applyResize(map, op, limits);
      assertInsideMap(opRegion(op), map.size);
      return applyOp(map, op);
    }),
  );
  return mergeChangesets(parts);
}
