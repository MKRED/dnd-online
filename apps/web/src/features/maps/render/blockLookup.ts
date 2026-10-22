import {
  AIR,
  cellTypeId,
  getBlock,
  MATERIALS,
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
export function createBlockLookup(palette: Palette) {
  const cache = new Map<number, BlockAppearance | null>();
  return (cell: number): BlockAppearance | null => {
    if (cell === AIR) return null;
    const typeId = cellTypeId(cell);
    let appearance = cache.get(typeId);
    if (appearance === undefined) {
      const block = getBlock(palette[typeId] ?? '');
      if (block) {
        const material = MATERIALS[block.material];
        appearance = {
          typeId,
          shape: block.shape,
          materialName: block.material,
          material,
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
