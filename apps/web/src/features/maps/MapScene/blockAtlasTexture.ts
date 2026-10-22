import {
  DataTexture,
  NearestFilter,
  RGBAFormat,
  SRGBColorSpace,
  type Texture,
} from 'three';
import {
  ATLAS_HEIGHT,
  ATLAS_WIDTH,
  atlasPixels,
} from '../render/textures/atlas';

let texture: Texture | null = null;

// Атлас текстур базовых блоков — одна текстура на страницу, общая для всех чанков и
// сцен: пиксели не меняются, а пересоздавать её на каждую сцену незачем.
// Пиксели берутся «как есть» (NearestFilter) — пиксельный стиль; без mipmap, иначе
// уменьшенные плитки смешались бы с соседними в атласе (docs/plan/blocks.md).
export function blockAtlasTexture(): Texture {
  if (texture) return texture;
  texture = new DataTexture(
    atlasPixels(),
    ATLAS_WIDTH,
    ATLAS_HEIGHT,
    RGBAFormat,
  );
  texture.magFilter = NearestFilter;
  texture.minFilter = NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
