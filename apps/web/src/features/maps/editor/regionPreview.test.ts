import { describe, expect, it } from 'vitest';
import {
  applyOp,
  createPalette,
  MemoryChunkStore,
  type SizedMapState,
} from 'shared';
import { blocksText, regionPreview } from './regionPreview';

// Карта 10 × 10 × 10: пол из камня на y = 0 и три мшистых блока на y = 1.
function map(): SizedMapState {
  const state = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 10, depth: 10, height: 10 },
  } as SizedMapState;
  applyOp(state, {
    op: 'fillBox',
    from: [0, 0, 0],
    to: [9, 0, 9],
    block: 'stone',
  });
  applyOp(state, {
    op: 'fillBox',
    from: [0, 1, 0],
    to: [2, 1, 0],
    block: 'mossy',
  });
  return state;
}

const box = (min: [number, number, number], max: [number, number, number]) => ({
  min,
  max,
});

describe('regionPreview', () => {
  it('заливка — весь объём, размер как у карты: ширина × глубина × высота', () => {
    expect(
      regionPreview(map(), {
        tool: 'fill',
        eraseMode: 'block',
        box: box([0, 1, 0], [4, 2, 2]),
        match: null,
      }),
    ).toEqual({ size: [5, 3, 2], blocks: 30, inner: null });
  });

  it('коробка — стены, пол и потолок; пустота внутри', () => {
    expect(
      regionPreview(map(), {
        tool: 'hollow',
        eraseMode: 'block',
        box: box([0, 1, 0], [6, 3, 4]),
        match: null,
      }),
    ).toEqual({ size: [7, 5, 3], blocks: 105 - 15, inner: [5, 3, 1] });
    // Тонкая коробка — сплошная.
    expect(
      regionPreview(map(), {
        tool: 'hollow',
        eraseMode: 'block',
        box: box([0, 1, 0], [6, 2, 4]),
        match: null,
      })?.inner,
    ).toBeNull();
  });

  it('замена считает только блоки как в первом углу', () => {
    expect(
      regionPreview(map(), {
        tool: 'replace',
        eraseMode: 'block',
        box: box([0, 0, 0], [3, 1, 1]),
        match: 'mossy',
      })?.blocks,
    ).toBe(3);
  });

  it('ластик областью считает только блоки, не воздух; блоком — не считает', () => {
    const state = map();
    expect(
      regionPreview(state, {
        tool: 'erase',
        eraseMode: 'region',
        box: box([0, 0, 0], [3, 2, 0]),
        match: null,
      })?.blocks,
    ).toBe(4 + 3);
    expect(
      regionPreview(state, {
        tool: 'erase',
        eraseMode: 'block',
        box: box([0, 0, 0], [3, 2, 0]),
        match: null,
      }),
    ).toBeNull();
  });

  it('слова по числу', () => {
    expect(blocksText(1)).toBe('1 блок');
    expect(blocksText(3)).toBe('3 блока');
    expect(blocksText(12)).toBe('12 блоков');
    expect(blocksText(30)).toBe('30 блоков');
    expect(blocksText(22)).toBe('22 блока');
  });
});
