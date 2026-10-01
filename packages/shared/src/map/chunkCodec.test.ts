import { describe, expect, it } from 'vitest';
import { CHUNK_BYTES, decodeChunk, encodeChunk } from './chunkCodec.js';
import { CHUNK_VOLUME } from './coords.js';

describe('кодек чанка', () => {
  it('восстанавливает значения, записывая их в little-endian', () => {
    const chunk = new Uint16Array(CHUNK_VOLUME);
    chunk[0] = 0x0102;
    chunk[CHUNK_VOLUME - 1] = 0xffff;

    const bytes = encodeChunk(chunk);

    expect(bytes.byteLength).toBe(CHUNK_BYTES);
    expect([bytes[0], bytes[1]]).toEqual([0x02, 0x01]);
    expect(decodeChunk(bytes)).toEqual(chunk);
  });

  it('читает данные с нечётным смещением в общем буфере', () => {
    const chunk = new Uint16Array(CHUNK_VOLUME).fill(4242);
    const pool = new Uint8Array(CHUNK_BYTES + 3);
    pool.set(encodeChunk(chunk), 1);

    expect(decodeChunk(pool.subarray(1, 1 + CHUNK_BYTES))).toEqual(chunk);
  });

  it('отклоняет данные неверной длины', () => {
    expect(() => decodeChunk(new Uint8Array(10))).toThrow(RangeError);
  });
});
