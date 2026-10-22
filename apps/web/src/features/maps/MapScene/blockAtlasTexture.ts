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
  type BlockAtlas,
} from '../render/textures/atlas';

const textures = new WeakMap<BlockAtlas, DataTexture>();

// Текстура видеокарты для атласа карты (render/textures/atlas.ts). Атлас дописывает
// места по мере надобности, поэтому при каждом обращении сверяем его версию: новые
// плитки — перезалить пиксели. Пиксели берутся «как есть» (NearestFilter) — пиксельный
// стиль; без mipmap, иначе уменьшенные плитки смешались бы с соседними в атласе
// (docs/plan/blocks.md).
export function blockAtlasTexture(atlas: BlockAtlas): Texture {
  let texture = textures.get(atlas);
  if (!texture) {
    texture = new DataTexture(
      atlas.pixels,
      ATLAS_WIDTH,
      ATLAS_HEIGHT,
      RGBAFormat,
    );
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = SRGBColorSpace;
    texture.userData.atlasVersion = -1;
    textures.set(atlas, texture);
  }
  if (texture.userData.atlasVersion !== atlas.version) {
    texture.userData.atlasVersion = atlas.version;
    texture.needsUpdate = true;
  }
  return texture;
}

export function releaseAtlasTexture(atlas: BlockAtlas) {
  textures.get(atlas)?.dispose();
  textures.delete(atlas);
}
