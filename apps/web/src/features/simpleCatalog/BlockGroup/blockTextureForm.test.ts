import { describe, expect, it } from 'vitest';
import { MATERIALS } from 'shared';
import { materialTextures, tileToBase64 } from '../../maps';
import {
  textureModeOf,
  texturesForMode,
  withUploadedTile,
} from './blockTextureForm';

const grass = materialTextures('grass');
const top = tileToBase64(grass.top);
const side = tileToBase64(grass.side);
const bottom = tileToBase64(grass.bottom);

describe('blockTextureForm', () => {
  it('узнаёт способ по самим текстурам', () => {
    expect(textureModeOf(null)).toBe('pattern');
    expect(textureModeOf({ top: side, side, bottom: side })).toBe('single');
    expect(textureModeOf({ top, side, bottom })).toBe('faces');
  });

  it('свои текстуры начинаются с узора основы в основном цвете', () => {
    const color = MATERIALS.grass.color;
    expect(texturesForMode('faces', null, 'grass', color)).toEqual({
      top,
      side,
      bottom,
    });
    // Одна на все грани — боковая плитка.
    expect(texturesForMode('single', null, 'grass', color)).toEqual({
      top: side,
      side,
      bottom: side,
    });
    expect(
      texturesForMode('pattern', { top, side, bottom }, 'grass', color),
    ).toBe(null);
  });

  it('загруженная плитка ложится на свою грань или на все', () => {
    const textures = { top, side, bottom };
    expect(withUploadedTile('faces', textures, 'top', 'new')).toEqual({
      top: 'new',
      side,
      bottom,
    });
    expect(withUploadedTile('single', textures, 'side', 'new')).toEqual({
      top: 'new',
      side: 'new',
      bottom: 'new',
    });
  });
});
