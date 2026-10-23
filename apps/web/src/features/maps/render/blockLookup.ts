import {
  AIR,
  BASE_BLOCKS,
  cellTypeId,
  MATERIALS,
  parseCustomBlockName,
  type BlockCatalog,
  type BlockInfo,
  type BlockMaterial,
  type Palette,
  type ShapeName,
} from 'shared';
import {
  atlasFor,
  materialSet,
  type AtlasSet,
  type BlockAtlas,
} from './textures/atlas';
import { blockTiles } from './textures/customTiles';
import { CUTOUT_MATERIALS } from './textures/materialTextures';

export interface BlockAppearance {
  typeId: number;
  shape: ShapeName;
  material: BlockMaterial;
  // Набор плиток в атласе карты (atlas.ts).
  tileSet: number;
  // Плитки с дырами (листва, свои текстуры с прозрачными пикселями): рисуются с
  // непрозрачными блоками, дыры вырезает alphaTest.
  cutout: boolean;
  // Полупрозрачный (стекло, лёд): своя сетка без записи глубины.
  translucent: boolean;
}

// Где в атласе плитки блока. У базового блока — место его материала. Своя группа
// получает своё место: в нём либо её текстуры, либо узор основы в её основном цвете
// (docs/plan/blocks.md, этап 4б).
// Дыры: у своих текстур — по их пикселям, у узора — как у основы (листва). Узор стекла
// полупрозрачный, а не дырявый, — он идёт в прозрачную сетку, как само стекло.
// ownTextures — в атласе лежат свои текстуры группы, а не узор основы (атлас бывает
// полон, и тогда даже группа со своими текстурами рисуется узором).
function placeTiles(
  atlas: BlockAtlas,
  block: BlockInfo,
): AtlasSet & { ownTextures: boolean } {
  // Формы группы делят одни плитки, а форма со своим видом получает свои (этап 5б):
  // ключ места даёт описание блока.
  const key = parseCustomBlockName(block.name) ? block.tiles : undefined;
  const own = key ? atlas.setFor(key, () => blockTiles(block)) : null;
  const patternHoles = CUTOUT_MATERIALS.has(block.material);
  if (!own)
    return {
      set: materialSet(block.material),
      holes: patternHoles,
      ownTextures: false,
    };
  return block.textures
    ? { ...own, ownTextures: true }
    : { set: own.set, holes: patternHoles, ownTextures: false };
}

// Внешний вид блоков по id палитры карты, с кэшем: сборщик спрашивает его на каждой грани.
// Описания — из того же каталога, что у правил (docs/plan/blocks.md, этап 2).
export function createBlockLookup(
  palette: Palette,
  catalog: BlockCatalog = BASE_BLOCKS,
) {
  const atlas = atlasFor(catalog);
  const cache = new Map<number, BlockAppearance | null>();
  return (cell: number): BlockAppearance | null => {
    if (cell === AIR) return null;
    const typeId = cellTypeId(cell);
    let appearance = cache.get(typeId);
    if (appearance === undefined) {
      const block = catalog.describe(palette[typeId] ?? '');
      if (block) {
        const { set, holes, ownTextures } = placeTiles(atlas, block);
        appearance = {
          typeId,
          shape: block.shape,
          material: block.traits,
          tileSet: set,
          cutout: holes,
          // Свои текстуры не бывают полупрозрачными: альфа у них только 0 или 255.
          translucent:
            !ownTextures && !holes && !MATERIALS[block.material].opaque,
        };
      } else {
        // Блок, которого каталог не описывает, не рисуем: это блок удалённой группы
        // (он теперь пустота, docs/plan/blocks.md) или палитра новее клиента.
        appearance = null;
      }
      cache.set(typeId, appearance);
    }
    return appearance;
  };
}

export type BlockLookup = ReturnType<typeof createBlockLookup>;
