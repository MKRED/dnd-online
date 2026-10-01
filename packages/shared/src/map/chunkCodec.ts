import { CHUNK_VOLUME } from './coords.js';

const BYTES_PER_CELL = 2;
export const CHUNK_BYTES = CHUNK_VOLUME * BYTES_PER_CELL;

// Бинарный формат чанка для БД (bytea) и сети (base64): CHUNK_VOLUME значений Uint16,
// little-endian — явно, а не «как у процессора», чтобы формат не зависел от платформы.
export function encodeChunk(chunk: Uint16Array): Uint8Array {
  const bytes = new Uint8Array(CHUNK_BYTES);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < CHUNK_VOLUME; i++) {
    view.setUint16(i * BYTES_PER_CELL, chunk[i], true);
  }
  return bytes;
}

// Данные копируются, а не оборачиваются: Buffer из pg часто — кусок общего пула
// с нечётным byteOffset, и new Uint16Array(buf.buffer, buf.byteOffset) на нём падает.
export function decodeChunk(bytes: Uint8Array): Uint16Array {
  if (bytes.byteLength !== CHUNK_BYTES) {
    throw new RangeError(
      `Чанк должен занимать ${CHUNK_BYTES} байт, получено ${bytes.byteLength}`,
    );
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const chunk = new Uint16Array(CHUNK_VOLUME);
  for (let i = 0; i < CHUNK_VOLUME; i++) {
    chunk[i] = view.getUint16(i * BYTES_PER_CELL, true);
  }
  return chunk;
}
