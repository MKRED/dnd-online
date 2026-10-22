import { MeshLambertMaterial } from 'three';
import { FOG_BRIGHTNESS, FOG_KEEP_COLOR } from '../render/fogColor';
import { blockAtlasTexture } from './blockAtlasTexture';

// Серая зона тумана попиксельно (docs/plan/done/fog-of-war.md, этап 5; docs/plan/blocks.md,
// этап 1): та же формула, что fogColor, но для каждого пикселя текстуры. Множитель цвета
// вершины так не умеет — у пикселей далеко от основного цвета (швы кирпича, гребни волн)
// он сдвигал оттенок вместо обесцвечивания.
const GREY_ZONE = /* glsl */ `
  float fogGrey = dot(diffuseColor.rgb, vec3(0.2126, 0.7152, 0.0722));
  vec3 fogged = (fogGrey + (diffuseColor.rgb - fogGrey) * ${FOG_KEEP_COLOR.toFixed(3)}) * ${FOG_BRIGHTNESS.toFixed(3)};
  diffuseColor.rgb = mix(diffuseColor.rgb, fogged, vFogDim);
`;

function createBlockMaterial(transparent: boolean): MeshLambertMaterial {
  // Прозрачность стекла и льда — в альфе их плиток (рамка стекла плотнее середины).
  const material = new MeshLambertMaterial({
    map: blockAtlasTexture(),
    transparent,
    depthWrite: !transparent,
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

let materials: {
  opaque: MeshLambertMaterial;
  transparent: MeshLambertMaterial;
} | null = null;

// Два материала на страницу — для непрозрачных и прозрачных блоков, общие для всех чанков.
export function blockMaterial(transparent: boolean): MeshLambertMaterial {
  materials ??= {
    opaque: createBlockMaterial(false),
    transparent: createBlockMaterial(true),
  };
  return transparent ? materials.transparent : materials.opaque;
}
