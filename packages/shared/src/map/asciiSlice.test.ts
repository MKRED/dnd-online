import { describe, expect, it } from 'vitest';
import { applyOp } from './applyOp.js';
import type { MapState } from './mapState.js';
import { MapOpError } from './ops.js';
import { MAX_SLICE_CELLS, renderAsciiSlice } from './asciiSlice.js';
import { MemoryChunkStore } from './chunkStore.js';
import { createPalette } from './palette.js';
import { mapBounds, summarizeMap } from './summary.js';

function sampleRoom(): MapState {
  const map: MapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
  };
  applyOp(map, {
    op: 'hollowBox',
    from: [-1, 0, 0],
    to: [3, 2, 3],
    block: 'stone',
  });
  applyOp(map, {
    op: 'setBlock',
    at: [1, 1, 3],
    block: 'wood_stairs',
    rotation: 90,
  });
  return map;
}

describe('renderAsciiSlice', () => {
  it('рисует срез с легендой и линейкой координат', () => {
    const slice = renderAsciiSlice(sampleRoom(), 1, {
      minX: -1,
      maxX: 3,
      minZ: 0,
      maxZ: 3,
    });

    expect(slice).toBe(
      [
        'Срез y=1, x=-1..3 (столбцы, слева направо), z=0..3 (строки, сверху вниз). Север — сверху.',
        '. = воздух',
        'A = stone (0°)',
        'B = wood_stairs (90°)',
        '',
        '  10123',
        '0 AAAAA',
        '1 A...A',
        '2 A...A',
        '3 AABAA',
      ].join('\n'),
    );
  });

  it('отказывается рисовать слишком большой или пустой срез', () => {
    const map = sampleRoom();
    const huge = { minX: 0, maxX: MAX_SLICE_CELLS, minZ: 0, maxZ: 0 };
    const inverted = { minX: 5, maxX: 0, minZ: 5, maxZ: 0 };
    expect(() => renderAsciiSlice(map, 0, huge)).toThrow(MapOpError);
    expect(() => renderAsciiSlice(map, 0, inverted)).toThrow(MapOpError);
  });
});

describe('summarizeMap', () => {
  it('считает границы и блоки по типам', () => {
    const summary = summarizeMap(sampleRoom());
    expect(summary.bounds).toEqual({ min: [-1, 0, 0], max: [3, 2, 3] });
    // Оболочка 5×3×4 = 60 клеток минус внутренность 3×1×2 = 6, одна заменена ступенями.
    expect(summary.blockCounts).toEqual({ stone: 53, wood_stairs: 1 });
  });

  it('пустая карта не имеет границ', () => {
    expect(mapBounds(new MemoryChunkStore())).toBeNull();
  });
});
