import { describe, expect, it } from 'vitest';
import { isBlockTextures, readBlockGroupFields } from './blockGroups.js';

// Плитка 16×16 RGBA в base64: 1024 байта.
const tile = (byte = 0) =>
  btoa(String.fromCharCode(...new Uint8Array(1024).fill(byte)));

describe('isBlockTextures', () => {
  it('принимает null и три плитки по 1024 байта', () => {
    expect(isBlockTextures(null)).toBe(true);
    expect(
      isBlockTextures({ top: tile(), side: tile(1), bottom: tile() }),
    ).toBe(true);
  });

  it('отказывает неполным, лишним и не тем по размеру', () => {
    expect(isBlockTextures({ top: tile(), side: tile() })).toBe(false);
    expect(
      isBlockTextures({ top: tile(), side: tile(), bottom: tile(), x: tile() }),
    ).toBe(false);
    const short = btoa(String.fromCharCode(...new Uint8Array(1023)));
    expect(isBlockTextures({ top: short, side: tile(), bottom: tile() })).toBe(
      false,
    );
    expect(isBlockTextures('abc')).toBe(false);
  });
});

describe('readBlockGroupFields', () => {
  it('испорченные текстуры читаются как узор основы', () => {
    expect(readBlockGroupFields({}, { textures: { top: 'x' } }).textures).toBe(
      null,
    );
    const textures = { top: tile(), side: tile(), bottom: tile() };
    expect(readBlockGroupFields({}, { textures }).textures).toEqual(textures);
  });
});
