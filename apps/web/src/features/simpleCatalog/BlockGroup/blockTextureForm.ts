import type { BlockTextures, MaterialName } from 'shared';
import { materialTextures, tileToBase64 } from '../../maps';

// Как заданы текстуры группы в форме (docs/plan/blocks.md, этап 4б): узор основы, одна
// картинка на все грани или своя на верх, бок и низ.
export type TextureMode = 'pattern' | 'single' | 'faces';
export type TextureFace = keyof BlockTextures;

export function textureModeOf(textures: BlockTextures | null): TextureMode {
  if (!textures) return 'pattern';
  return textures.top === textures.side && textures.side === textures.bottom
    ? 'single'
    : 'faces';
}

// Узор основы в основном цвете — с него начинаются свои текстуры: заменили одну грань,
// остальные остаются такими, какими были видны.
function patternTextures(look: MaterialName, color: string): BlockTextures {
  const tiles = materialTextures(look, color);
  return {
    top: tileToBase64(tiles.top),
    side: tileToBase64(tiles.side),
    bottom: tileToBase64(tiles.bottom),
  };
}

// Текстуры после смены способа. В «одну на все» уходит боковая плитка: у травы и
// тропы бок — самый узнаваемый вид блока.
export function texturesForMode(
  mode: TextureMode,
  textures: BlockTextures | null,
  look: MaterialName,
  color: string,
): BlockTextures | null {
  if (mode === 'pattern') return null;
  const current = textures ?? patternTextures(look, color);
  if (mode === 'faces') return current;
  return { top: current.side, side: current.side, bottom: current.side };
}

// Загруженная плитка: в «одной на все» — на все грани, иначе на свою.
export function withUploadedTile(
  mode: TextureMode,
  textures: BlockTextures,
  face: TextureFace,
  tile: string,
): BlockTextures {
  return mode === 'single'
    ? { top: tile, side: tile, bottom: tile }
    : { ...textures, [face]: tile };
}
