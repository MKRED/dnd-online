import {
  applyOps,
  chunkKey,
  createMask,
  createPalette,
  maskAdd,
  MemoryChunkStore,
  type MapState,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { decodeFog } from '../fogMasks';
import { createBlockLookup } from './blockLookup';
import { buildChunkMesh } from './buildChunkMesh';
import { updateChunkMeshes } from './chunkMeshCache';
import { fogColor } from './fogColor';

// Туман войны в рендере (docs/plan/done/fog-of-war.md, этап 5): серые блоки вне поля зрения.

function twoBlocks(): MapState {
  const map: MapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
  };
  applyOps(map, [
    { op: 'setBlock', at: [0, 0, 0], block: 'grass' },
    { op: 'setBlock', at: [20, 0, 0], block: 'grass' },
  ]);
  return map;
}

// Цвета вершин сборки — по три числа на вершину.
function colorsOf(map: MapState, seen: Uint8Array | null | undefined) {
  const lookup = createBlockLookup(map.palette);
  const mesh = buildChunkMesh(map.store, chunkKey(0, 0, 0), lookup, {
    ...(seen !== undefined && { seen }),
  });
  return [...mesh.opaque!.colors.slice(0, 3)];
}

describe('fogColor', () => {
  it('keeps a little colour and darkens', () => {
    const [r, g, b] = fogColor([0.2, 0.6, 0.1]);
    expect(g).toBeLessThan(0.6 * 0.5);
    // Зелёное остаётся зеленее красного: трава и камень различимы.
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });
});

describe('buildChunkMesh with fog', () => {
  it('greys a block the party does not see now', () => {
    const map = twoBlocks();
    const plain = colorsOf(map, undefined);
    const visible = createMask();
    maskAdd(visible, [0, 0, 0]);
    expect(colorsOf(map, visible.get('0,0,0'))).toEqual(plain);
    const grey = colorsOf(map, null);
    expect(grey).not.toEqual(plain);
    expect(grey[0]).toBeCloseTo(fogColor(plain as [number, number, number])[0]);
  });
});

describe('updateChunkMeshes with fog', () => {
  it('repaints only the chunks whose visible bits changed', () => {
    const map = twoBlocks();
    const first = createMask();
    maskAdd(first, [0, 0, 0]);
    maskAdd(first, [20, 0, 0]);
    const before = updateChunkMeshes(null, map, Infinity, first);
    // Второй чанк ушёл из поля зрения: новый массив только у него.
    const next = new Map(first);
    next.set('1,0,0', new Uint8Array(512));
    const after = updateChunkMeshes(before, map, Infinity, next);
    expect(after.chunks.get('0,0,0')).toBe(before.chunks.get('0,0,0'));
    expect(after.chunks.get('1,0,0')).not.toBe(before.chunks.get('1,0,0'));
    // Туман пропал — перекрашено всё.
    const off = updateChunkMeshes(after, map, Infinity, null);
    expect(off.chunks.get('0,0,0')).not.toBe(after.chunks.get('0,0,0'));
  });
});

describe('decodeFog', () => {
  it('keeps the array of a chunk that did not change', () => {
    const bits = btoa(String.fromCharCode(...new Uint8Array(512).fill(1)));
    const other = btoa(String.fromCharCode(...new Uint8Array(512).fill(2)));
    const view = {
      explored: [{ cx: 0, cy: 0, cz: 0, bits }],
      visible: [
        { cx: 0, cy: 0, cz: 0, bits },
        { cx: 1, cy: 0, cz: 0, bits },
      ],
    };
    const first = decodeFog(view, null)!;
    expect(first.masks.visible.get('0,0,0')![0]).toBe(1);
    const second = decodeFog(
      {
        ...view,
        visible: [view.visible[0], { cx: 1, cy: 0, cz: 0, bits: other }],
      },
      first,
    )!;
    expect(second.masks.visible.get('0,0,0')).toBe(
      first.masks.visible.get('0,0,0'),
    );
    expect(second.masks.visible.get('1,0,0')![0]).toBe(2);
    expect(decodeFog(null, first)).toBeNull();
  });
});
