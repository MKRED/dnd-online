import type { Vec3 } from '../coords.js';
import { assertInsideMap, type MapSize } from '../mapSize.js';
import { MapOpError } from '../mapOpError.js';
import {
  CONTAINER_CAPACITY,
  containerLoad,
  loadLabel,
} from './containerLoad.js';
import { objectFacing, type MapObject, type MapObjects } from './mapObject.js';
import type { ObjectChange } from './objectChanges.js';
import { fieldsOfKind } from './objectFields.js';
import type { ObjectOp } from './objectOps.js';
import { objectSpan, type ObjectRefs } from './objectRefs.js';

export interface ObjectEditContext {
  objects: MapObjects;
  refs: ObjectRefs;
  size: MapSize;
  maxObjects: number;
}

// Применяет операцию объекта к объектам карты и возвращает, что изменилось.
export function applyObjectOp(
  ctx: ObjectEditContext,
  op: ObjectOp,
): ObjectChange[] {
  const { objects } = ctx;
  if (op.op === 'placeObject') {
    if (objects.byId.size >= ctx.maxObjects) {
      throw new MapOpError(
        `На карте уже ${objects.byId.size} объектов — это предел`,
      );
    }
    // hidden — после тела: у сохранённого объекта он есть всегда, true или false.
    const object = {
      id: objects.nextId,
      at: op.at,
      ...op.object,
      hidden: op.object.hidden ?? false,
    };
    checkRefs(ctx, object, null);
    checkLoad(ctx, object, null);
    assertFits(ctx, object);
    objects.nextId++;
    return write(objects, null, object);
  }

  const current = objects.byId.get(op.id);
  if (!current) throw new MapOpError(`Объекта ${op.id} нет на карте`);
  switch (op.op) {
    case 'moveObject': {
      const moved = { ...current, at: op.at };
      assertFits(ctx, moved);
      return write(objects, current, moved);
    }
    case 'turnObject':
      if (objectFacing(current) === null) {
        throw new MapOpError(
          `У объекта ${op.id} нет направления взгляда: оно есть у старта, существ и контейнеров`,
        );
      }
      return write(objects, current, {
        ...current,
        facing: op.facing,
      } as MapObject);
    case 'updateObject': {
      const allowed = fieldsOfKind(current.kind);
      for (const key of Object.keys(op.object)) {
        if (!allowed.includes(key as (typeof allowed)[number])) {
          throw new MapOpError(
            `У объекта ${op.id} («${current.kind}») нет поля «${key}»`,
          );
        }
      }
      const updated = { ...current, ...op.object } as MapObject;
      checkRefs(ctx, updated, current);
      checkLoad(ctx, updated, current);
      assertFits(ctx, updated);
      return write(objects, current, updated);
    }
    case 'removeObject':
      return write(objects, current, null);
  }
}

function write(
  objects: MapObjects,
  before: MapObject | null,
  after: MapObject | null,
): ObjectChange[] {
  const id = (after ?? before)!.id;
  if (after) objects.byId.set(id, after);
  else objects.byId.delete(id);
  return [{ id, before, after }];
}

// Место объекта целиком внутри карты: у крупного существа — весь квадрат.
function assertFits(ctx: ObjectEditContext, object: MapObject) {
  const span = objectSpan(object, ctx.refs);
  const [x, y, z] = object.at;
  const max: Vec3 = [x + span - 1, y, z + span - 1];
  assertInsideMap({ min: object.at, max }, ctx.size);
}

// Ссылки проверяются, только когда они новые: то, что уже стоит на карте, могли
// скрыть или удалить после постановки — убрать или сдвинуть такой объект всё равно можно.
function checkRefs(
  ctx: ObjectEditContext,
  object: MapObject,
  previous: MapObject | null,
) {
  const { refs } = ctx;
  if (
    object.kind === 'monster' &&
    (previous?.kind !== 'monster' || previous.monsterId !== object.monsterId)
  ) {
    const monster = refs.monsters.get(object.monsterId);
    if (!monster?.usable) {
      throw new MapOpError(`Монстр ${object.monsterId} не найден в каталоге`);
    }
    if (monster.role === 'unique') {
      const other = [...ctx.objects.byId.values()].find(
        (o) =>
          o.id !== object.id &&
          o.kind === 'monster' &&
          o.monsterId === object.monsterId,
      );
      if (other) {
        throw new MapOpError(
          `Уникальный монстр «${monster.name}» уже стоит на карте (объект ${other.id})`,
        );
      }
    }
  }
  if (
    object.kind === 'npc' &&
    (previous?.kind !== 'npc' || previous.characterId !== object.characterId) &&
    !refs.npcs.has(object.characterId)
  ) {
    throw new MapOpError(
      `НПС ${object.characterId} не найден среди ваших персонажей`,
    );
  }
  const before = new Set(itemIds(previous));
  for (const itemId of itemIds(object)) {
    if (!before.has(itemId) && !refs.items.has(itemId)) {
      throw new MapOpError(`Предмет ${itemId} не найден в каталоге`);
    }
  }
}

// Груз контейнера не больше вместимости вида. Правку, которая не делает хуже, не
// останавливаем: контейнер мог стать тяжелее вместимости без неё — вес предмета
// поменяли в каталоге, — и переименовать или разгрузить его всё равно нужно.
function checkLoad(
  ctx: ObjectEditContext,
  object: MapObject,
  previous: MapObject | null,
) {
  if (object.kind !== 'container') return;
  const weightOf = (itemId: string) => ctx.refs.items.get(itemId) ?? 0;
  const load = containerLoad(object.items, weightOf);
  const capacity = CONTAINER_CAPACITY[object.look];
  if (load <= capacity) return;
  if (previous?.kind === 'container') {
    const before = containerLoad(previous.items, weightOf);
    if (load <= before && capacity >= CONTAINER_CAPACITY[previous.look]) return;
  }
  throw new MapOpError(
    `Не влезет в «${object.name}»: ${loadLabel(load, capacity)}`,
  );
}

function itemIds(object: MapObject | null): string[] {
  if (object?.kind === 'item') return [object.itemId];
  if (object?.kind === 'container') return object.items.map((i) => i.itemId);
  return [];
}
