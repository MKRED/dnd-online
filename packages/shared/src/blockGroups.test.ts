import { describe, expect, it } from 'vitest';
import {
  isBlockShapeLooks,
  isBlockTextures,
  readBlockGroupFields,
} from './blockGroups.js';

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

describe('isBlockShapeLooks', () => {
  const textures = { top: tile(), side: tile(1), bottom: tile() };

  it('принимает пустой набор и формы кроме куба с текстурами и цветом', () => {
    expect(isBlockShapeLooks({})).toBe(true);
    expect(
      isBlockShapeLooks({
        stairs: { textures, color: '#112233' },
        slab_top: { textures, color: '#aabbcc' },
      }),
    ).toBe(true);
  });

  it('отказывает кубу, чужой форме, null вместо текстур, лишнему полю и плохому цвету', () => {
    expect(isBlockShapeLooks({ cube: { textures, color: '#112233' } })).toBe(
      false,
    );
    expect(isBlockShapeLooks({ tower: { textures, color: '#112233' } })).toBe(
      false,
    );
    expect(
      isBlockShapeLooks({ stairs: { textures: null, color: '#112233' } }),
    ).toBe(false);
    expect(
      isBlockShapeLooks({ stairs: { textures, color: '#112233', x: 1 } }),
    ).toBe(false);
    expect(isBlockShapeLooks({ stairs: { textures, color: 'red' } })).toBe(
      false,
    );
    expect(isBlockShapeLooks(null)).toBe(false);
    expect(isBlockShapeLooks([])).toBe(false);
  });

  it('старая запись без форм и испорченные формы читаются как пустой набор', () => {
    expect(readBlockGroupFields({}, {}).shapes).toEqual({});
    expect(readBlockGroupFields({}, { shapes: { cube: 1 } }).shapes).toEqual(
      {},
    );
    const shapes = { pillar: { textures, color: '#123456' } };
    expect(readBlockGroupFields({}, { shapes }).shapes).toEqual(shapes);
  });
});
