import { isRotation, type Rotation } from './cell.js';
import { boxFromCorners, boxVolume, type Box3, type Vec3 } from './coords.js';
import type { MapBoundsLimits } from './mapSize.js';
import { MapOpError } from './mapOpError.js';
import { parseCell, type Fields } from './opFields.js';
import { isKnownBlockName } from './palette.js';
import {
  isObjectOpKind,
  parseObjectOp,
  type ObjectOp,
} from './objects/objectOps.js';
import { parseResizeOp, type ResizeOp } from './resizeOp.js';

export { MapOpError };

// Операции — единственный способ изменить карту: редактор мастера, API/MCP
// для нейросети и (позже) способности в игре идут через них. Объекты на карте —
// тоже операции (objects/objectOps.ts), чтобы у них были отмена и журнал.
export type MapOp = BlockOp | ResizeOp | ObjectOp;

// Операции над блоками в области; resize меняет саму карту (resizeOp.ts).
export type BlockOp =
  | { op: 'setBlock'; at: Vec3; block: string; rotation?: Rotation }
  // Залить область блоком; блок «air» очищает область.
  | { op: 'fillBox'; from: Vec3; to: Vec3; block: string; rotation?: Rotation }
  // Оболочка области из блока, внутри — воздух (комната).
  | {
      op: 'hollowBox';
      from: Vec3;
      to: Vec3;
      block: string;
      rotation?: Rotation;
    }
  // Заменить в области блоки «match» (с любым поворотом) на «block».
  | {
      op: 'replace';
      from: Vec3;
      to: Vec3;
      match: string;
      block: string;
      rotation?: Rotation;
    };

export type MapOpKind = MapOp['op'];

// Ширина и глубина конкретной карты проверяются при применении (editMap): здесь
// только то, что верно для любой карты, — координаты от нуля и общие пределы.
export interface MapLimits extends MapBoundsLimits {
  // Сколько клеток может затронуть одна операция.
  maxOpVolume: number;
}

export function isBlockOp(op: MapOp): op is BlockOp {
  return op.op !== 'resize' && !isObjectOpKind(op.op);
}

export function isObjectOp(op: MapOp): op is ObjectOp {
  return isObjectOpKind(op.op);
}

export function opRegion(op: BlockOp): Box3 {
  return op.op === 'setBlock'
    ? { min: op.at, max: op.at }
    : boxFromCorners(op.from, op.to);
}

function parseBlock(fields: Fields, key: string): string {
  const value = fields[key];
  if (typeof value !== 'string' || !isKnownBlockName(value)) {
    throw new MapOpError(`Неизвестный блок в «${key}»: ${String(value)}`);
  }
  return value;
}

function parseRotation(fields: Fields): Rotation | undefined {
  const value = fields.rotation;
  if (value === undefined) return undefined;
  if (!isRotation(value)) {
    throw new MapOpError('«rotation» должен быть 0, 90, 180 или 270');
  }
  return value;
}

// Разбирает операцию из недоверенного JSON (REST, MCP) и проверяет лимиты.
export function parseMapOp(input: unknown, limits: MapLimits): MapOp {
  if (typeof input !== 'object' || input === null) {
    throw new MapOpError('Операция должна быть объектом');
  }
  const fields = input as Fields;
  const rotation = parseRotation(fields);
  let op: BlockOp;
  switch (fields.op) {
    case 'setBlock':
      op = {
        op: 'setBlock',
        at: parseCell(fields, 'at', limits),
        block: parseBlock(fields, 'block'),
        rotation,
      };
      break;
    case 'fillBox':
    case 'hollowBox':
      op = {
        op: fields.op,
        from: parseCell(fields, 'from', limits),
        to: parseCell(fields, 'to', limits),
        block: parseBlock(fields, 'block'),
        rotation,
      };
      break;
    case 'replace':
      op = {
        op: 'replace',
        from: parseCell(fields, 'from', limits),
        to: parseCell(fields, 'to', limits),
        match: parseBlock(fields, 'match'),
        block: parseBlock(fields, 'block'),
        rotation,
      };
      break;
    case 'resize':
      // Объёмом resize не ограничен: она трогает только непустые клетки карты.
      return parseResizeOp(fields, limits);
    case 'placeObject':
    case 'moveObject':
    case 'turnObject':
    case 'updateObject':
    case 'removeObject':
      return parseObjectOp(fields, limits);
    default:
      throw new MapOpError(`Неизвестная операция: ${String(fields.op)}`);
  }
  const volume = boxVolume(opRegion(op));
  if (volume > limits.maxOpVolume) {
    throw new MapOpError(
      `Операция затрагивает ${volume} клеток, максимум — ${limits.maxOpVolume}`,
    );
  }
  return op;
}
