import { describe, expect, it } from 'vitest';
import {
  createBlockCatalog,
  createPalette,
  encodeCell,
  resolveBlockId,
  type BlockGroupInfo,
} from 'shared';
import { createBlockLookup } from './blockLookup';
import { materialSet } from './textures/atlas';
import { tileToBase64 } from './textures/customTiles';
import { paintTile } from './textures/pixels';

const group: BlockGroupInfo = {
  id: '0b5c6f2e-8a1d-4c3b-9e7f-1a2b3c4d5e6f',
  name: 'Угли',
  look: 'scorched',
  color: '#552211',
  opaque: true,
  durability: null,
  flammable: false,
  movementCost: 1,
  climbable: false,
  hazard: null,
  textures: null,
};

// Вид блока по имени: ставим его в палитру и спрашиваем лукап по id.
function appearance(groups: BlockGroupInfo[], name: string) {
  const catalog = createBlockCatalog(groups);
  const palette = createPalette();
  const { id } = resolveBlockId(palette, name, catalog);
  return createBlockLookup(palette, catalog)(encodeCell(id));
}

describe('createBlockLookup', () => {
  it('базовый блок рисуется плитками своего материала', () => {
    expect(appearance([], 'stone')).toMatchObject({
      tileSet: materialSet('stone'),
      cutout: false,
      translucent: false,
    });
    expect(appearance([], 'glass')?.translucent).toBe(true);
    expect(appearance([], 'leaves')?.cutout).toBe(true);
  });

  it('своя группа получает своё место в атласе — узор основы в её цвете', () => {
    const embers = appearance([group], group.id);
    expect(embers?.tileSet).not.toBe(materialSet('scorched'));
    // Все формы группы — с теми же плитками.
    expect(appearance([group], `${group.id}_stairs`)?.tileSet).toBe(
      embers?.tileSet,
    );
  });

  it('узор стекла остаётся полупрозрачным, а не дырявым', () => {
    const glass = appearance([{ ...group, look: 'glass' }], group.id);
    expect(glass).toMatchObject({ translucent: true, cutout: false });
  });

  it('свои текстуры с дырами — как листва, без дыр — сплошные', () => {
    const solid = tileToBase64(paintTile(() => [10, 20, 30]));
    const holes = tileToBase64(
      paintTile((x) => (x % 2 ? [10, 20, 30, 255] : [0, 0, 0, 0])),
    );
    // Основа — стекло, но свои текстуры решают, как блок рисуется.
    const own = { ...group, look: 'glass' as const };
    expect(
      appearance(
        [{ ...own, textures: { top: solid, side: solid, bottom: solid } }],
        group.id,
      ),
    ).toMatchObject({ translucent: false, cutout: false });
    expect(
      appearance(
        [{ ...own, textures: { top: solid, side: holes, bottom: solid } }],
        group.id,
      ),
    ).toMatchObject({ translucent: false, cutout: true });
  });
});
