import { describe, expect, it } from 'vitest';
import { applyOp } from './applyOp.js';
import { BASE_BLOCKS, blockInfo, type BlockCatalog } from './blockInfo.js';
import { readCell, MemoryChunkStore } from './chunkStore.js';
import { HAZARDS } from './materialHazards.js';
import type { MapState } from './mapState.js';
import { createPalette } from './palette.js';
import { segmentBlocked } from './rules/segment.js';
import { stepCost } from './rules/step.js';
import { hazardsUnder } from './rules/support.js';

// Пол из земли на y = 0 и каменная стена поперёк в x = 2.
function room(blocks?: BlockCatalog): MapState {
  const map: MapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    blocks,
  };
  applyOp(map, {
    op: 'fillBox',
    from: [0, 0, 0],
    to: [4, 0, 4],
    block: 'dirt',
  });
  applyOp(map, {
    op: 'fillBox',
    from: [2, 1, 0],
    to: [2, 3, 4],
    block: 'stone',
  });
  return map;
}

// Каталог, в котором камень прозрачен, а земля труднопроходима и горит, как лава.
const swapped: BlockCatalog = {
  describe(name) {
    const base = BASE_BLOCKS.describe(name);
    if (!base) return undefined;
    if (base.material === 'stone') {
      return { ...base, traits: { ...base.traits, opaque: false } };
    }
    if (base.material === 'dirt') {
      return {
        ...base,
        traits: { ...base.traits, movementCost: 2, hazard: HAZARDS.lava },
      };
    }
    return base;
  },
};

describe('blockInfo', () => {
  it('описывает блок клетки по палитре, воздух — null', () => {
    const map = room();
    expect(blockInfo(map, readCell(map.store, [2, 1, 0]))).toMatchObject({
      name: 'stone',
      shape: 'cube',
      material: 'stone',
    });
    expect(blockInfo(map, readCell(map.store, [0, 5, 0]))).toBeNull();
  });

  it('без каталога правила берут встроенные блоки', () => {
    const map = room();
    expect(segmentBlocked(map, [0.5, 2.5, 2.5], [4.5, 2.5, 2.5], 'sight')).toBe(
      true,
    );
    expect(stepCost(map, [0, 1, 0], [1, 1, 0], 'medium')).toBe(5);
    expect(hazardsUnder(map, [0, 1, 0], 'medium')).toEqual([]);
  });

  it('свойства из подменённого каталога меняют обзор, шаг и опасность', () => {
    const map = room(swapped);
    expect(segmentBlocked(map, [0.5, 2.5, 2.5], [4.5, 2.5, 2.5], 'sight')).toBe(
      false,
    );
    // Для стрел и заклинаний камень по-прежнему преграда.
    expect(
      segmentBlocked(map, [0.5, 2.5, 2.5], [4.5, 2.5, 2.5], 'effect'),
    ).toBe(true);
    expect(stepCost(map, [0, 1, 0], [1, 1, 0], 'medium')).toBe(10);
    expect(hazardsUnder(map, [0, 1, 0], 'medium')).toEqual([
      { material: 'dirt', hazard: HAZARDS.lava },
    ]);
  });
});
