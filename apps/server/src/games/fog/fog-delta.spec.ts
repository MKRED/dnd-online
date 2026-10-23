import { describe, expect, it } from 'vitest';
import {
  applyOp,
  BASE_BLOCKS,
  createMask,
  maskAdd,
  MemoryChunkStore,
  createPalette,
  emptyObjectRefs,
  type MapObject,
  type Vec3,
} from 'shared';
import type { SceneRow } from '../scenes/scene-copy.js';
import { emptyDelta, playerFogDelta } from './fog-delta.js';
import type { FogRecount } from './fog-recount.js';

// Сцена: каменный пол 4×4; гоблин в [3, 1, 3]. «До» открыт угол [0..1], «после» — весь пол.
function recount(objects: MapObject[] = []): FogRecount {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  applyOp(map, {
    op: 'fillBox',
    from: [0, 0, 0],
    to: [3, 0, 3],
    block: 'stone',
  });
  const mask = (cells: Vec3[]) => {
    const m = createMask();
    for (const cell of cells) maskAdd(m, cell);
    return m;
  };
  const corner: Vec3[] = [
    [0, 0, 0],
    [1, 0, 0],
  ];
  const all: Vec3[] = [];
  for (let x = 0; x < 4; x++) for (let z = 0; z < 4; z++) all.push([x, 0, z]);
  all.push([3, 1, 3]);
  return {
    scene: { id: 's1', seq: 3 } as SceneRow,
    world: {
      map: { ...map, blocks: BASE_BLOCKS },
      objects,
      creatures: [],
      starts: [],
      refs: emptyObjectRefs(),
    },
    before: { explored: mask(corner), visible: mask(corner) },
    after: { explored: mask(all), visible: mask(all) },
    written: 1,
  };
}

const goblin: MapObject = {
  id: 7,
  at: [3, 1, 3],
  hidden: false,
  kind: 'monster',
  monsterId: '00000000-0000-4000-8000-000000000001',
  facing: 0,
};

describe('разница тумана игрокам', () => {
  it('клетка, которую правка открыла, приходит из воздуха', () => {
    const delta = playerFogDelta(recount(), 4, {
      // Пол в [2, 0, 2] заменили; игрок его раньше не видел.
      cells: [2, 0, 2, 1, 2],
      paletteAdded: [],
    });
    expect(delta.seq).toBe(4);
    const cells = delta.changes.cells;
    const at = (x: number, z: number) => {
      for (let i = 0; i < cells.length; i += 5) {
        if (cells[i] === x && cells[i + 2] === z) return cells.slice(i, i + 5);
      }
      return null;
    };
    expect(at(2, 2)).toEqual([2, 0, 2, 0, 2]);
    // Остальной новый пол — как поставленный; уже открытый угол не повторяется.
    expect(at(3, 3)?.slice(0, 4)).toEqual([3, 0, 3, 0]);
    expect(at(3, 3)?.[4]).not.toBe(0);
    expect(at(0, 0)).toBeNull();
  });

  it('существо, вошедшее в поле зрения, появляется; маски — изменившимися чанками', () => {
    const delta = playerFogDelta(recount([goblin]), 3, undefined);
    expect(delta.changes.objects).toEqual([
      { id: 7, before: null, after: goblin },
    ]);
    expect(delta.fog.explored).toHaveLength(1);
    expect(delta.fog.visible).toHaveLength(1);
    expect(emptyDelta(delta)).toBe(false);
  });
});
