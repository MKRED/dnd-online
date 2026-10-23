import type { Vec3 } from '../coords.js';
import type { MapSize } from '../mapSize.js';
import { MapOpError } from '../mapOpError.js';
import { resizeFate, type ResizeFate } from '../resizeOp.js';
import type { MapObject, MapObjects } from './mapObject.js';
import type { ObjectChange } from './objectChanges.js';
import { objectBox, type ObjectRefs } from './objectRefs.js';

// Куда объект попадёт после resize и что с ним будет — по тому же правилу, что блоки
// (resizeFate): ушёл в отрицательные координаты — срезан, место хоть частью за
// восточной или южной границей — за границей.
export function objectResizeFate(
  object: MapObject,
  shift: Vec3,
  after: MapSize,
  refs: ObjectRefs,
): { at: Vec3; fate: ResizeFate } {
  const at: Vec3 = [
    object.at[0] + shift[0],
    object.at[1] + shift[1],
    object.at[2] + shift[2],
  ];
  if (resizeFate(at, after) === 'cut') return { at, fate: 'cut' };
  const { min, max } = objectBox(object, refs);
  const far: Vec3 = [at[0] + max[0] - min[0], at[1], at[2] + max[2] - min[2]];
  return { at, fate: resizeFate(far, after) };
}

// Сдвигает объекты вместе с блоками. Срезанные удаляются всегда, оказавшиеся за
// восточной или южной границей — по cut: удаляются или остаются там и не рисуются.
// Признак hidden им не ставится: он значит «видит только мастер», это другое.
export function resizeObjects(
  objects: MapObjects,
  refs: ObjectRefs,
  shift: Vec3,
  after: MapSize,
  keepOutside: boolean,
  maxHeight: number,
): ObjectChange[] {
  const changes: ObjectChange[] = [];
  for (const object of [...objects.byId.values()]) {
    const { at, fate } = objectResizeFate(object, shift, after, refs);
    const removed = fate === 'cut' || (fate === 'outside' && !keepOutside);
    if (!removed && at[1] >= maxHeight) {
      throw new MapOpError(
        `Объект ${object.id} поднимется выше предела высоты: ${maxHeight} уровней`,
      );
    }
    const next = removed ? null : { ...object, at };
    if (next && at.every((v, axis) => v === object.at[axis])) continue;
    if (next) objects.byId.set(object.id, next);
    else objects.byId.delete(object.id);
    changes.push({ id: object.id, before: object, after: next });
  }
  return changes;
}
