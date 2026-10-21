import { describe, expect, it } from 'vitest';
import { applyOp } from '../applyOp.js';
import { MemoryChunkStore } from '../chunkStore.js';
import { HAZARDS, hazardLabel } from '../materialHazards.js';
import type { MapState } from '../mapState.js';
import { createPalette } from '../palette.js';
import { stepCost } from './step.js';
import { hazardsUnder, supportMaterials } from './support.js';

// Земля под y = 0, в ней клетка лавы [2, -1, 0] и плита кислоты в [0, 0, 3].
function hazardFloor(): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  applyOp(map, {
    op: 'fillBox',
    from: [-4, -1, -4],
    to: [4, -1, 4],
    block: 'dirt',
  });
  applyOp(map, { op: 'setBlock', at: [2, -1, 0], block: 'lava' });
  applyOp(map, { op: 'setBlock', at: [0, 0, 3], block: 'acid_slab' });
  return map;
}

describe('опасности под существом', () => {
  const map = hazardFloor();

  it('на земле опасностей нет, на лаве — лава', () => {
    expect(hazardsUnder(map, [0, 0, 0], 'medium')).toEqual([]);
    expect(hazardsUnder(map, [2, 0, 0], 'medium')).toEqual([
      { material: 'lava', hazard: HAZARDS.lava },
    ]);
  });

  it('плита опасна сама, а не блок под ней', () => {
    expect(supportMaterials(map, [0, 0, 3], 'medium')).toEqual(['acid']);
    expect(hazardsUnder(map, [0, 0, 3], 'medium')[0]?.material).toBe('acid');
  });

  it('Большому хватает одной клетки основания на лаве', () => {
    expect(supportMaterials(map, [1, 0, -1], 'large').sort()).toEqual([
      'dirt',
      'lava',
    ]);
    expect(hazardsUnder(map, [1, 0, -1], 'large')).toHaveLength(1);
  });

  it('по лаве бредут как по труднопроходимой местности', () => {
    expect(stepCost(map, [1, 0, 0], [2, 0, 0], 'medium')).toBe(10);
    expect(stepCost(map, [2, 0, 0], [1, 0, 0], 'medium')).toBe(5);
  });

  it('подпись опасности — кости, тип и спасбросок', () => {
    expect(hazardLabel(HAZARDS.lava)).toBe('10к10 (Огонь)');
    expect(hazardLabel(HAZARDS.swamp)).toBe(
      '1к10 (Яд), спасбросок Телосложения Сл 12, при успехе половина',
    );
  });
});
