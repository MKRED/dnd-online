import type { BlockInfo, BlockTextures } from 'shared';
import {
  FACE_KINDS,
  materialTextures,
  type MaterialTextures,
} from './materialTextures';
import { TILE_SIZE, type Tile } from './pixels';

const TILE_BYTES = TILE_SIZE * TILE_SIZE * 4;

// Плитка своей группы хранится base64 пикселей RGBA (shared BlockTextures,
// docs/plan/blocks.md, этап 4б).
export function tileFromBase64(data: string): Tile {
  const binary = atob(data);
  const tile = new Uint8ClampedArray(TILE_BYTES);
  for (let i = 0; i < TILE_BYTES; i++) tile[i] = binary.charCodeAt(i);
  return tile;
}

export function tileToBase64(tile: Tile): string {
  let binary = '';
  for (const byte of tile) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function decodeTextures(textures: BlockTextures): MaterialTextures {
  return {
    top: tileFromBase64(textures.top),
    side: tileFromBase64(textures.side),
    bottom: tileFromBase64(textures.bottom),
  };
}

// Плитки блока: свои текстуры группы или узор основы в основном цвете.
export function blockTiles(info: BlockInfo): MaterialTextures {
  return info.textures
    ? decodeTextures(info.textures)
    : materialTextures(info.material, info.traits.color);
}

// Есть ли в плитках дыры — тогда блок рисуется с alphaTest, как листва.
export function hasHoles(textures: MaterialTextures): boolean {
  return FACE_KINDS.some((face) => {
    const tile = textures[face];
    for (let i = 3; i < tile.length; i += 4) if (tile[i] < 255) return true;
    return false;
  });
}
