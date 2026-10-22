import {
  AIR,
  BASE_BLOCKS,
  cellTypeId,
  type BlockCatalog,
  type BlockMaterial,
  type MaterialName,
  type Palette,
  type ShapeName,
} from 'shared';

export interface BlockAppearance {
  typeId: number;
  shape: ShapeName;
  materialName: MaterialName;
  material: BlockMaterial;
}

// Внешний вид блоков по id палитры карты, с кэшем: сборщик спрашивает его на каждой грани.
// Описания — из того же каталога, что у правил (docs/plan/blocks.md, этап 2).
export function createBlockLookup(
  palette: Palette,
  catalog: BlockCatalog = BASE_BLOCKS,
) {
  const cache = new Map<number, BlockAppearance | null>();
  return (cell: number): BlockAppearance | null => {
    if (cell === AIR) return null;
    const typeId = cellTypeId(cell);
    let appearance = cache.get(typeId);
    if (appearance === undefined) {
      const block = catalog.describe(palette[typeId] ?? '');
      if (block) {
        appearance = {
          typeId,
          shape: block.shape,
          materialName: block.material,
          material: block.traits,
        };
      } else {
        // Неизвестный блок (палитра новее клиента) не рисуем, а не падаем.
        console.error('Unknown block in map palette', palette[typeId]);
        appearance = null;
      }
      cache.set(typeId, appearance);
    }
    return appearance;
  };
}

export type BlockLookup = ReturnType<typeof createBlockLookup>;
