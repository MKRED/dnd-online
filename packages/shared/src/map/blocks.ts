import { MATERIALS, type MaterialName } from './materials.js';
import { SHAPE_LABELS, SHAPE_NAMES, type ShapeName } from './shapes.js';

export interface BlockDefinition {
  name: string;
  label: string;
  material: MaterialName;
  shape: ShapeName;
}

// Имя блока — материал для куба («stone») и «материал_форма» для остальных («stone_stairs»).
// Каталог — все сочетания; позже сюда добавятся блоки из билдера.
function buildCatalog(): Map<string, BlockDefinition> {
  const catalog = new Map<string, BlockDefinition>();
  for (const material of Object.keys(MATERIALS) as MaterialName[]) {
    for (const shape of SHAPE_NAMES) {
      const name = shape === 'cube' ? material : `${material}_${shape}`;
      const label =
        shape === 'cube'
          ? MATERIALS[material].label
          : `${MATERIALS[material].label}: ${SHAPE_LABELS[shape].toLowerCase()}`;
      catalog.set(name, { name, label, material, shape });
    }
  }
  return catalog;
}

export const BLOCK_CATALOG: ReadonlyMap<string, BlockDefinition> =
  buildCatalog();

export function getBlock(name: string): BlockDefinition | undefined {
  return BLOCK_CATALOG.get(name);
}
