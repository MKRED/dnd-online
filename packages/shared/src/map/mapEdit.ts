import { applyOp } from './applyOp.js';
import { applyResize } from './applyResize.js';
import type { Changeset } from './changeset.js';
import { mergeChangesets } from './changesetMerge.js';
import {
  assertInsideMap,
  type MapBoundsLimits,
  type SizedMapState,
} from './mapSize.js';
import { MapOpError } from './mapOpError.js';
import { applyObjectOp } from './objects/applyObjectOp.js';
import type { MapObjects } from './objects/mapObject.js';
import { emptyObjectRefs, type ObjectRefs } from './objects/objectRefs.js';
import { isObjectOp, opRegion, type MapOp } from './ops.js';
import { numbered } from './opsBatch.js';

// Карта, которую правит editMap. Объекты — у карт, где они загружены; без них
// операции объектов отклоняются, а resize двигает только блоки.
export interface EditableMap extends SizedMapState {
  objects?: MapObjects;
}

// Что правка знает об объектах помимо самой карты (docs/plan/map-objects.md).
export interface MapEditContext {
  // Монстры, предметы и НПС, на которые ссылаются пачка и затронутые ею объекты.
  refs?: ObjectRefs;
  // Сколько объектов может быть на карте (MAP_MAX_OBJECTS).
  maxObjects?: number;
}

export const DEFAULT_MAX_OBJECTS = 500;

// Правка настоящей карты (сервер, под блокировкой карты): операции над блоками не
// выходят за её размер, resize меняет размер. Размер проверяется по ходу пачки:
// после resize следующая операция уже строит в новых границах. При ошибке карта в
// памяти остаётся изменённой наполовину — вызывающий её отбрасывает (откат транзакции).
export function editMap(
  map: EditableMap,
  ops: MapOp[],
  limits: MapBoundsLimits,
  context: MapEditContext = {},
): Changeset {
  const refs = context.refs ?? emptyObjectRefs();
  const parts = ops.map((op, index) =>
    numbered(index, (): Changeset => {
      if (op.op === 'resize') return applyResize(map, op, limits, refs);
      if (isObjectOp(op)) {
        if (!map.objects) {
          throw new MapOpError('Объекты на этой карте пока недоступны');
        }
        const objects = applyObjectOp(
          {
            objects: map.objects,
            refs,
            size: map.size,
            maxObjects: context.maxObjects ?? DEFAULT_MAX_OBJECTS,
          },
          op,
        );
        return { cells: [], paletteAdded: [], objects };
      }
      assertInsideMap(opRegion(op), map.size);
      return applyOp(map, op);
    }),
  );
  return mergeChangesets(parts);
}
