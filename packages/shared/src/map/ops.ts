import { isRotation, type Rotation } from './cell.js';
import { boxFromCorners, boxVolume, type Box3, type Vec3 } from './coords.js';
import type { MapBoundsLimits } from './mapSize.js';
import { MapOpError } from './mapOpError.js';
import { isKnownBlockName } from './palette.js';
import { parseResizeOp, type ResizeOp } from './resizeOp.js';

export { MapOpError };

// Операции — единственный способ изменить блоки карты: редактор мастера, API/MCP
// для нейросети и (позже) способности в игре идут через них.
export type MapOp = BlockOp | ResizeOp;

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
  return op.op !== 'resize';
}

export function opRegion(op: BlockOp): Box3 {
  return op.op === 'setBlock'
    ? { min: op.at, max: op.at }
    : boxFromCorners(op.from, op.to);
}

type Fields = Record<string, unknown>;

function parseCell(fields: Fields, key: string, limits: MapLimits): Vec3 {
  const value = fields[key];
  if (
    !Array.isArray(value) ||
    value.length !== 3 ||
    !value.every((n) => Number.isSafeInteger(n))
  ) {
    throw new MapOpError(`«${key}» должно быть тремя целыми числами [x, y, z]`);
  }
  const [x, y, z] = value as number[];
  if (x < 0 || y < 0 || z < 0) {
    throw new MapOpError(
      `Координаты «${key}» не могут быть меньше нуля: карта начинается в [0, 0, 0]`,
    );
  }
  if (x >= limits.maxSize || z >= limits.maxSize) {
    throw new MapOpError(
      `«${key}»: x и z должны быть меньше ${limits.maxSize} — это наибольший размер карты`,
    );
  }
  if (y >= limits.maxHeight) {
    throw new MapOpError(
      `«${key}»: y должен быть меньше ${limits.maxHeight} — это предел высоты карты`,
    );
  }
  return [x, y, z];
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
