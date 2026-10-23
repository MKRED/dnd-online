import type { BlockGroupFields, BlockTextures, ShapeName } from 'shared';

export type GroupLook = Pick<
  BlockGroupFields,
  'look' | 'color' | 'textures' | 'shapes'
>;

// Как выглядит форма группы: свой вид формы (docs/plan/blocks.md, этап 5б) или вид
// группы. Так же форму описывает каталог карты (shared createBlockCatalog).
export function shapeAppearance(
  group: GroupLook,
  shape: ShapeName,
): { textures: BlockTextures | null; color: string } {
  const own = shape === 'cube' ? undefined : group.shapes[shape];
  return own ?? { textures: group.textures, color: group.color };
}
