import {
  CHUNK_VOLUME,
  cellFromChunk,
  cellLocation,
  parseChunkKey,
  type Vec3,
} from '../../coords.js';

// Набор клеток как битовые маски по чанкам: 16³ бит = 512 байт на чанк. Так же
// хранится в базе и уходит игроку, а карта бывает 256×256 — Set строк был бы тяжёлым.
export type CellMask = Map<string, Uint8Array>;

export const MASK_BYTES = CHUNK_VOLUME / 8;

export function createMask(): CellMask {
  return new Map();
}

// Биты одного чанка — для обработки чанка целиком (вырезать неоткрытое из его
// клеток, сравнить «видно» до и после) циклом по индексу, без ключа на клетку.
// Индекс бита — тот же, что у клетки в чанке (localIndex).
export function maskBits(mask: CellMask, key: string): Uint8Array | undefined {
  return mask.get(key);
}

export function maskHas(mask: CellMask, cell: Vec3): boolean {
  const { key, index } = cellLocation(cell);
  const bits = mask.get(key);
  return bits !== undefined && (bits[index >> 3] & (1 << (index & 7))) !== 0;
}

export function maskAdd(mask: CellMask, cell: Vec3): void {
  const { key, index } = cellLocation(cell);
  let bits = mask.get(key);
  if (!bits) {
    bits = new Uint8Array(MASK_BYTES);
    mask.set(key, bits);
  }
  bits[index >> 3] |= 1 << (index & 7);
}

// Объединение в target: туман общий для группы — видимое всеми смотрящими.
export function maskUnion(target: CellMask, source: CellMask): CellMask {
  for (const [key, bits] of source) {
    const into = target.get(key);
    if (!into) {
      target.set(key, bits.slice());
      continue;
    }
    for (let i = 0; i < MASK_BYTES; i++) into[i] |= bits[i];
  }
  return target;
}

export function maskSize(mask: CellMask): number {
  let count = 0;
  for (const bits of mask.values()) {
    for (const byte of bits) {
      for (let b = byte; b !== 0; b &= b - 1) count++;
    }
  }
  return count;
}

export function* maskCells(mask: CellMask): Generator<Vec3> {
  for (const [key, bits] of mask) {
    const chunk = parseChunkKey(key);
    for (let index = 0; index < CHUNK_VOLUME; index++) {
      if (bits[index >> 3] & (1 << (index & 7))) {
        yield cellFromChunk(chunk, index);
      }
    }
  }
}
