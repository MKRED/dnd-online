import { Color } from 'three';
import {
  AIR,
  cellTypeId,
  getBlock,
  MATERIALS,
  type BlockMaterial,
  type Palette,
  type ShapeName,
} from 'shared';

export interface BlockAppearance {
  typeId: number;
  shape: ShapeName;
  material: BlockMaterial;
  // Линейный RGB для vertex colors. Через Color, а не hex/255: three считает
  // вершинные цвета линейными, и «сырые» sRGB-значения выглядели бы блёкло.
  color: [number, number, number];
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
        const color = new Color(material.color);
        appearance = {
          typeId,
          shape: block.shape,
          material,
          color: [color.r, color.g, color.b],
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
