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
// force — постановка с Shift (docs/plan/blocks.md, «Пересечения»): обстановку ставят без
// проверок места и опоры — закопать клад, вмуровать решётку. У других видов не нужен.
export type ObjectOp =
  | { op: 'placeObject'; at: Vec3; object: PlacedObject; force?: true }
  | { op: 'moveObject'; id: number; at: Vec3; force?: true }
  | { op: 'turnObject'; id: number; facing: Facing; force?: true }
  // Меняет только переданные поля; вид объекта не меняется.
  | { op: 'updateObject'; id: number; object: ObjectFields; force?: true }
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

// Новый объект. Скрытым его ставят сразу: в открытой сцене поставленный видимым и
// спрятанный следом объект игроки успели бы увидеть.
export type PlacedObject = MapObjectBody & { hidden?: boolean };

function placeBody(input: Fields): PlacedObject {
  const kind = input.kind as MapObjectKind;
  const fields = parseObjectFields(input, kind);
  const body = kindBody(kind, fields);
  return fields.hidden ? { ...body, hidden: true } : body;
}

// Тело объекта по виду: вид обязателен, у необязательных полей — значения по умолчанию.
function kindBody(kind: MapObjectKind, fields: ObjectFields): MapObjectBody {
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
        facing,
      };
    }
    case 'item':
      return {
        kind,
        itemId: required(fields.itemId, 'itemId'),
        quantity: fields.quantity ?? 1,
      };
    case 'furniture':
      return {
        kind,
        furnitureId: required(fields.furnitureId, 'furnitureId'),
        facing,
      };
  }
}

// «Без проверок» — только true; любое другое значение — ошибка, а не молчаливое «нет».
function parseForce(fields: Fields): { force?: true } {
  if (fields.force === undefined || fields.force === false) return {};
  if (fields.force !== true) throw new MapOpError('«force» — true или false');
  return { force: true };
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
        ...parseForce(fields),
      };
    case 'moveObject':
      return {
        op: 'moveObject',
        id: parseId(fields),
        at: parseCell(fields, 'at', limits),
        ...parseForce(fields),
      };
    case 'turnObject': {
      const { facing } = parseObjectFields({ facing: fields.facing }, null);
      return {
        op: 'turnObject',
        id: parseId(fields),
        facing: required(facing, 'facing'),
        ...parseForce(fields),
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
        ...parseForce(fields),
      };
    }
    default:
      return { op: 'removeObject', id: parseId(fields) };
  }
}
