import {
  emptyRefsView,
  isObjectOp,
  objectRefIds,
  type Changeset,
  type MapObject,
  type MapObjectRefsView,
  type MapObjects,
  type MapOp,
} from 'shared';
import type { DbTransaction } from '../../database/database.service.js';
import type { maps } from '../../database/schema/index.js';
import { loadObjects } from './map-object-storage.js';
import { loadRefs, type LoadedRefs, type RefIds } from './map-object-refs.js';

type MapRow = typeof maps.$inferSelect;

// Ссылки, которые пачка ставит или меняет: их проверяет editMap.
function opsRefIds(ops: MapOp[]): RefIds {
  const ids = objectRefIds([]);
  for (const op of ops) {
    if (!isObjectOp(op)) continue;
    if (op.op !== 'placeObject' && op.op !== 'updateObject') continue;
    const fields = op.object as Partial<Record<string, unknown>>;
    if (typeof fields.monsterId === 'string')
      ids.monsters.add(fields.monsterId);
    if (typeof fields.characterId === 'string')
      ids.npcs.add(fields.characterId);
    if (typeof fields.itemId === 'string') ids.items.add(fields.itemId);
    for (const { itemId } of (fields.items as { itemId: string }[]) ?? []) {
      ids.items.add(itemId);
    }
  }
  return ids;
}

function unionIds(a: RefIds, b: RefIds): RefIds {
  return {
    monsters: new Set([...a.monsters, ...b.monsters]),
    items: new Set([...a.items, ...b.items]),
    npcs: new Set([...a.npcs, ...b.npcs]),
  };
}

// Объекты карты и ссылки — всех объектов карты (размеры монстров нужны resize и
// границе) и тех, что ставит пачка.
export async function loadObjectsForEdit(
  tx: DbTransaction,
  userId: string,
  map: MapRow,
  ops: MapOp[],
): Promise<{ objects: MapObjects; loaded: LoadedRefs }> {
  const objects = await loadObjects(tx, map.id, map.nextObjectId);
  const ids = unionIds(objectRefIds(objects.byId.values()), opsRefIds(ops));
  return { objects, loaded: await loadRefs(tx, userId, ids) };
}

// Объекты, которые остались на карте после правки.
function touchedObjects(applied: Changeset): MapObject[] {
  return (applied.objects ?? []).flatMap((c) => (c.after ? [c.after] : []));
}

// Справочник для ответа на правку — только по затронутым объектам.
export function touchedRefsView(
  view: MapObjectRefsView,
  applied: Changeset,
): MapObjectRefsView {
  const ids = objectRefIds(touchedObjects(applied));
  const result = emptyRefsView();
  for (const id of ids.monsters) result.monsters[id] = view.monsters[id];
  for (const id of ids.items) result.items[id] = view.items[id];
  for (const id of ids.npcs) result.npcs[id] = view.npcs[id];
  return result;
}

// То же для отмены и повтора: справочник не загружен заранее, читаем по затронутым.
export async function loadTouchedRefsView(
  tx: DbTransaction,
  userId: string,
  applied: Changeset,
): Promise<MapObjectRefsView> {
  const touched = touchedObjects(applied);
  if (touched.length === 0) return emptyRefsView();
  return (await loadRefs(tx, userId, objectRefIds(touched))).view;
}

export function createdObjectIds(applied: Changeset): number[] {
  return (applied.objects ?? [])
    .filter((c) => c.before === null && c.after !== null)
    .map((c) => c.id)
    .sort((a, b) => a - b);
}
