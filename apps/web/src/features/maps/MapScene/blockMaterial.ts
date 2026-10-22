import { MeshLambertMaterial } from 'three';
import { FOG_BRIGHTNESS, FOG_KEEP_COLOR } from '../render/fogColor';
import type { BlockAtlas } from '../render/textures/atlas';
import { blockAtlasTexture, releaseAtlasTexture } from './blockAtlasTexture';

// Серая зона тумана попиксельно (docs/plan/done/fog-of-war.md, этап 5; docs/plan/blocks.md,
// этап 1): та же формула, что fogColor, но для каждого пикселя текстуры. Множитель цвета
// вершины так не умеет — у пикселей далеко от основного цвета (швы кирпича, гребни волн)
// он сдвигал оттенок вместо обесцвечивания.
const GREY_ZONE = /* glsl */ `
  float fogGrey = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 fogged = (fogGrey + (diffuseColor.rgb - fogGrey) * ${FOG_KEEP_COLOR.toFixed(3)}) * ${FOG_BRIGHTNESS.toFixed(3)};
  diffuseColor.rgb = mix(diffuseColor.rgb, fogged, vFogDim);
`;

function createBlockMaterial(
  atlas: BlockAtlas,
  transparent: boolean,
): MeshLambertMaterial {
  // Прозрачность стекла и льда — в альфе их плиток (рамка стекла плотнее середины).
  // У непрозрачного материала alphaTest вырезает дыры листвы и своих текстур.
  const material = new MeshLambertMaterial({
    map: blockAtlasTexture(atlas),
    transparent,
    depthWrite: !transparent,
    alphaTest: transparent ? 0 : 0.5,
  });
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nattribute float fogDim;\nvarying float vFogDim;',
      )
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvFogDim = fogDim;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFogDim;')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>\n${GREY_ZONE}`,
      );
  };
  material.customProgramCacheKey = () => 'block-grey-zone';
  return material;
}

const materials = new WeakMap<
  BlockAtlas,
  { opaque: MeshLambertMaterial; transparent: MeshLambertMaterial }
>();

// Освобождает видеопамять атласа, который больше не нужен: правка группы приходит
// новым каталогом, а с ним и новый атлас (MapScene). Понадобится снова — создастся.
export function releaseBlockMaterials(atlas: BlockAtlas) {
  const pair = materials.get(atlas);
  if (!pair) return;
  materials.delete(atlas);
  pair.opaque.dispose();
  pair.transparent.dispose();
  releaseAtlasTexture(atlas);
}

// Два материала на атлас карты — для непрозрачных и прозрачных блоков, общие для всех
// её чанков. Текстура сверяет версию атласа при каждом обращении (blockAtlasTexture).
export function blockMaterial(
  atlas: BlockAtlas,
  transparent: boolean,
): MeshLambertMaterial {
  let pair = materials.get(atlas);
  if (!pair) {
    pair = {
      opaque: createBlockMaterial(atlas, false),
      transparent: createBlockMaterial(atlas, true),
    };
    materials.set(atlas, pair);
  }
  blockAtlasTexture(atlas);
  return transparent ? pair.transparent : pair.opaque;
}
