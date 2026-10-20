import type { Vec3 } from '../coords.js';
import type { MapBoundsLimits } from '../mapSize.js';
import { MapOpError } from '../mapOpError.js';
import { parseCell, type Fields } from '../opFields.js';
import {
  CONTAINER_LOOK_LABELS,
  type Facing,
  type MapObjectBody,
  type MapObjectKind,
} from './mapObject.js';
import { parseObjectFields, type ObjectFields } from './objectFields.js';

// Операции объектов (docs/plan/done/map-objects.md, «Операции объектов»). Номер нового
// объекта выдаёт сервер; сослаться на объект, поставленный в той же пачке, нельзя.
export type ObjectOp =
  | { op: 'placeObject'; at: Vec3; object: MapObjectBody }
  | { op: 'moveObject'; id: number; at: Vec3 }
  | { op: 'turnObject'; id: number; facing: Facing }
  // Меняет только переданные поля; вид объекта не меняется.
  | { op: 'updateObject'; id: number; object: ObjectFields }
  | { op: 'removeObject'; id: number };

export const OBJECT_OP_KINDS = [
  'placeObject',
  'moveObject',
  'turnObject',
  'updateObject',
  'removeObject',
] as const;

export function isObjectOpKind(kind: unknown): kind is ObjectOp['op'] {
  return OBJECT_OP_KINDS.includes(kind as ObjectOp['op']);
}

function parseId(fields: Fields): number {
  const id = fields.id;
  if (!Number.isSafeInteger(id) || (id as number) < 1) {
    throw new MapOpError('«id» — номер объекта на карте, целое число от 1');
  }
  return id as number;
}

function parseObject(fields: Fields): Fields {
  const object = fields.object;
  if (typeof object !== 'object' || object === null || Array.isArray(object)) {
    throw new MapOpError('«object» должен быть объектом с полями объекта');
  }
  return object as Fields;
}

// Новый объект: вид обязателен, у необязательных полей — значения по умолчанию.
function placeBody(input: Fields): MapObjectBody {
  const kind = input.kind as MapObjectKind;
  const fields = parseObjectFields(input, kind);
  const facing = fields.facing ?? 0;
  switch (kind) {
    case 'start':
      return { kind, facing };
    case 'monster':
      return {
        kind,
        monsterId: required(fields.monsterId, 'monsterId'),
        facing,
      };
    case 'npc':
      return {
        kind,
        characterId: required(fields.characterId, 'characterId'),
        size: fields.size ?? 'medium',
        facing,
      };
    case 'container': {
      const look = fields.look ?? 'chest';
      return {
        kind,
        look,
        // Без названия контейнер зовётся по виду: «Бочка», «Мешок».
        name: fields.name ?? CONTAINER_LOOK_LABELS[look],
        items: fields.items ?? [],
      };
    }
    case 'item':
      return {
        kind,
        itemId: required(fields.itemId, 'itemId'),
        quantity: fields.quantity ?? 1,
      };
  }
}

function required<T>(value: T | undefined, key: string): T {
  if (value === undefined) throw new MapOpError(`Нужно поле «${key}»`);
  return value;
}

export function parseObjectOp(
  fields: Fields,
  limits: MapBoundsLimits,
): ObjectOp {
  switch (fields.op) {
    case 'placeObject':
      return {
        op: 'placeObject',
        at: parseCell(fields, 'at', limits),
        object: placeBody(parseObject(fields)),
      };
    case 'moveObject':
      return {
        op: 'moveObject',
        id: parseId(fields),
        at: parseCell(fields, 'at', limits),
      };
    case 'turnObject': {
      const { facing } = parseObjectFields({ facing: fields.facing }, null);
      return {
        op: 'turnObject',
        id: parseId(fields),
        facing: required(facing, 'facing'),
      };
    }
    case 'updateObject': {
      const object = parseObject(fields);
      if ('kind' in object) {
        throw new MapOpError(
          'Вид объекта не меняется: уберите объект и поставьте новый',
        );
      }
      return {
        op: 'updateObject',
        id: parseId(fields),
        object: parseObjectFields(object, null),
      };
    }
    default:
      return { op: 'removeObject', id: parseId(fields) };
  }
}
