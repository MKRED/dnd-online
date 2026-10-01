// Значение клетки в чанке (Uint16): биты 0–1 — поворот, остальные — id типа из палитры карты.
export const AIR = 0;

export const ROTATIONS = [0, 90, 180, 270] as const;
export type Rotation = (typeof ROTATIONS)[number];

const ROTATION_BITS = 2;
export const MAX_BLOCK_TYPE_ID = (1 << (16 - ROTATION_BITS)) - 1;

// Воздух — ровно 0: у типа 0 поворот отбрасывается, иначе значения 1–3 выглядели бы
// как непустые клетки (чанк не удалился бы, ASCII-срез показал бы «блок»).
export function encodeCell(typeId: number, rotation: Rotation = 0): number {
  if (typeId === AIR) return AIR;
  if (!Number.isInteger(typeId) || typeId < 0 || typeId > MAX_BLOCK_TYPE_ID) {
    throw new RangeError(`Недопустимый id типа блока: ${typeId}`);
  }
  return (typeId << ROTATION_BITS) | ROTATIONS.indexOf(rotation);
}

export function cellTypeId(cell: number): number {
  return cell >> ROTATION_BITS;
}

export function cellRotation(cell: number): Rotation {
  return ROTATIONS[cell & ((1 << ROTATION_BITS) - 1)];
}

export function isRotation(value: unknown): value is Rotation {
  return ROTATIONS.includes(value as Rotation);
}
