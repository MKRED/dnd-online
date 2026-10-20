import { sameObject, type MapObject, type MapObjects } from './mapObject.js';

// Изменение объекта в changeset: null «до» — объект поставлен, null «после» — убран.
export interface ObjectChange {
  id: number;
  before: MapObject | null;
  after: MapObject | null;
}

// Сливает изменения объектов одной пачки, как клетки: первое «до», последнее «после»;
// объект, вернувшийся к исходному виду (или поставленный и тут же убранный), выпадает.
export function mergeObjectChanges(parts: ObjectChange[][]): ObjectChange[] {
  const merged = new Map<number, ObjectChange>();
  for (const change of parts.flat()) {
    const previous = merged.get(change.id);
    merged.set(
      change.id,
      previous ? { ...previous, after: change.after } : change,
    );
  }
  return [...merged.values()].filter((c) => !sameObject(c.before, c.after));
}

// forward — повторить, backward — откатить. Объект, который после этой правки уже
// изменили, не трогается и возвращается конфликтом — как клетки (changeset.ts).
export function applyObjectChanges(
  objects: MapObjects,
  changes: ObjectChange[],
  forward: boolean,
): { conflicts: number[]; applied: ObjectChange[] } {
  const ordered = forward ? changes : [...changes].reverse();
  const conflicts: number[] = [];
  const applied: ObjectChange[] = [];
  for (const { id, before, after } of ordered) {
    const [expected, target] = forward ? [before, after] : [after, before];
    if (!sameObject(objects.byId.get(id) ?? null, expected)) {
      conflicts.push(id);
      continue;
    }
    if (target) objects.byId.set(id, target);
    else objects.byId.delete(id);
    // Номер, пришедший в changeset (повтор, правка с сервера), счётчик не выдаст снова.
    objects.nextId = Math.max(objects.nextId, id + 1);
    applied.push({ id, before: expected, after: target });
  }
  return { conflicts, applied };
}
