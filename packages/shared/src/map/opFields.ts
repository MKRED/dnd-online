import type { Vec3 } from './coords.js';
import type { MapBoundsLimits } from './mapSize.js';
import { MapOpError } from './mapOpError.js';

// Поля операций из недоверенного JSON (REST, MCP): общие для блоков и объектов.
export type Fields = Record<string, unknown>;

export function parseCell(
  fields: Fields,
  key: string,
  limits: MapBoundsLimits,
): Vec3 {
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
