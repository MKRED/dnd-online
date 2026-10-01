import { describe, expect, it } from 'vitest';
import { applyOp } from './applyOp.js';
import { AIR, cellRotation, cellTypeId } from './cell.js';
import { MemoryChunkStore, readCell } from './chunkStore.js';
import type { MapState } from './mapState.js';
import type { MapOp } from './ops.js';
import { createPalette } from './palette.js';

function emptyMap(): MapState {
  return { store: new MemoryChunkStore(), palette: createPalette() };
}

function blockAt(map: MapState, x: number, y: number, z: number) {
  return map.palette[cellTypeId(readCell(map.store, [x, y, z]))];
}

describe('applyOp', () => {
  it('setBlock дописывает блок в палитру и пишет клетку с поворотом', () => {
    const map = emptyMap();
    const changes = applyOp(map, {
      op: 'setBlock',
      at: [-1, 0, -1],
      block: 'wood_stairs',
      rotation: 180,
    });

    expect(changes.paletteAdded).toEqual([{ id: 1, name: 'wood_stairs' }]);
    expect(changes.cells).toHaveLength(1);
    expect(blockAt(map, -1, 0, -1)).toBe('wood_stairs');
    expect(cellRotation(readCell(map.store, [-1, 0, -1]))).toBe(180);
  });

  it('fillBox через границу чанков создаёт все задетые чанки', () => {
    const map = emptyMap();
    const changes = applyOp(map, {
      op: 'fillBox',
      from: [-2, 0, 0],
      to: [17, 0, 0],
      block: 'stone',
    });

    expect(changes.cells).toHaveLength(20);
    expect([...map.store.keys()].sort()).toEqual(['-1,0,0', '0,0,0', '1,0,0']);
  });

  it('hollowBox делает оболочку и очищает внутренность', () => {
    const map = emptyMap();
    const box = { from: [0, 0, 0], to: [4, 4, 4] } as const;
    applyOp(map, { op: 'fillBox', ...box, block: 'dirt' });
    applyOp(map, { op: 'hollowBox', ...box, block: 'brick' });

    expect(readCell(map.store, [2, 2, 2])).toBe(AIR);
    expect(blockAt(map, 0, 2, 2)).toBe('brick');
  });

  it('replace меняет только совпавшие блоки', () => {
    const map = emptyMap();
    const row = { from: [0, 0, 0], to: [2, 0, 0] } as const;
    applyOp(map, { op: 'fillBox', ...row, block: 'grass' });
    applyOp(map, { op: 'setBlock', at: [1, 0, 0], block: 'stone' });
    const changes = applyOp(map, {
      op: 'replace',
      ...row,
      match: 'grass',
      block: 'dirt',
    });

    expect(changes.cells.map((c) => c.at[0])).toEqual([0, 2]);
    expect(blockAt(map, 1, 0, 0)).toBe('stone');
  });

  it('replace без совпадений не дописывает блок в палитру', () => {
    const map = emptyMap();
    applyOp(map, { op: 'setBlock', at: [0, 0, 0], block: 'stone' });
    const changes = applyOp(map, {
      op: 'replace',
      from: [0, 0, 0],
      to: [3, 3, 3],
      match: 'grass',
      block: 'ice',
    });

    expect(changes).toEqual({ cells: [], paletteAdded: [] });
    expect(map.palette).toEqual(['air', 'stone']);
  });

  it('не включает в changeset клетки, которые не изменились', () => {
    const map = emptyMap();
    const op: MapOp = {
      op: 'fillBox',
      from: [0, 0, 0],
      to: [3, 0, 3],
      block: 'sand',
    };
    applyOp(map, op);
    expect(applyOp(map, op).cells).toHaveLength(0);
  });

  it('удаляет опустевшие чанки', () => {
    const map = emptyMap();
    applyOp(map, { op: 'setBlock', at: [-5, 3, 20], block: 'stone' });
    applyOp(map, { op: 'setBlock', at: [-5, 3, 20], block: 'air' });
    expect([...map.store.keys()]).toEqual([]);
  });
});
