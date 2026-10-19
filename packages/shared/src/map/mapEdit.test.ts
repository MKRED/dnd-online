import { describe, expect, it } from 'vitest';
import { applyChangeset } from './changeset.js';
import { packChangeset, unpackChangeset } from './changesetPacking.js';
import { MemoryChunkStore, type ChunkStore } from './chunkStore.js';
import { editMap } from './mapEdit.js';
import type { SizedMapState } from './mapSize.js';
import { MapOpError } from './ops.js';
import { createPalette } from './palette.js';

const limits = { maxSize: 64, maxHeight: 16 };

function emptyMap(): SizedMapState {
  return {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 8, depth: 8 },
  };
}

function snapshot(store: ChunkStore) {
  return new Map(
    [...store.keys()].map((key) => [key, Array.from(store.get(key) ?? [])]),
  );
}

describe('editMap', () => {
  it('отклоняет операцию за границей карты и называет её номер', () => {
    const map = emptyMap();
    expect(() =>
      editMap(
        map,
        [
          { op: 'setBlock', at: [7, 0, 7], block: 'stone' },
          { op: 'fillBox', from: [0, 0, 0], to: [8, 0, 2], block: 'stone' },
        ],
        limits,
      ),
    ).toThrow(
      'Операция №2: Область [0, 0, 0] – [8, 0, 2] за границей карты 8 × 8',
    );
    expect(() =>
      editMap(map, [{ op: 'setBlock', at: [0, 0, 9], block: 'stone' }], limits),
    ).toThrow(MapOpError);
  });

  it('после resize в той же пачке строит уже в новых границах', () => {
    const map = emptyMap();
    const changes = editMap(
      map,
      [
        { op: 'resize', grow: { east: 4 } },
        { op: 'setBlock', at: [11, 0, 0], block: 'stone' },
      ],
      limits,
    );
    expect(changes.size?.after).toEqual({ width: 12, depth: 8 });
    expect(changes.cells).toHaveLength(1);
  });

  it('отмена resize возвращает размер и сдвинутые блоки, повтор — снова сдвигает', () => {
    const map = emptyMap();
    editMap(
      map,
      [{ op: 'fillBox', from: [0, 0, 0], to: [7, 1, 7], block: 'grass' }],
      limits,
    );
    const before = snapshot(map.store);

    const changes = editMap(
      map,
      [{ op: 'resize', grow: { west: 2, north: -1, down: 1 } }],
      limits,
    );
    const after = snapshot(map.store);
    // Журнал хранит changeset упакованным — проверяем путь через него.
    const stored = unpackChangeset(
      JSON.parse(JSON.stringify(packChangeset(changes))),
    );

    applyChangeset(map, stored, 'backward');
    expect(map.size).toEqual({ width: 8, depth: 8 });
    expect(snapshot(map.store)).toEqual(before);

    applyChangeset(map, stored, 'forward');
    expect(map.size).toEqual({ width: 10, depth: 7 });
    expect(snapshot(map.store)).toEqual(after);
  });

  it('changeset с размером на карте другого размера — ошибка, а не порча', () => {
    const map = emptyMap();
    const changes = editMap(
      map,
      [{ op: 'resize', grow: { south: 2 } }],
      limits,
    );
    const other = emptyMap();
    other.size = { width: 5, depth: 5 };
    expect(() => applyChangeset(other, changes, 'forward')).toThrow(
      'Размер карты расходится',
    );
  });

  it('пачка, вернувшая размер к исходному, размер в changeset не пишет', () => {
    const map = emptyMap();
    const changes = editMap(
      map,
      [
        { op: 'resize', grow: { east: 2 } },
        { op: 'resize', grow: { east: -2 } },
      ],
      limits,
    );
    expect(changes.size).toBeUndefined();
    expect(packChangeset(changes)).not.toHaveProperty('size');
  });
});
