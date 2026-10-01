import {
  applyOps,
  cellLocation,
  createPalette,
  MemoryChunkStore,
  type MapOp,
  type MapState,
} from 'shared';
import { describe, expect, it } from 'vitest';
import { createBlockLookup } from './blockLookup';
import { buildChunkMesh, type MeshBuffers } from './buildChunkMesh';

function mapWith(ops: MapOp[]): MapState {
  const map: MapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
  };
  applyOps(map, ops);
  return map;
}

function mesh(map: MapState, at: [number, number, number], cutY?: number) {
  return buildChunkMesh(
    map.store,
    cellLocation(at).key,
    createBlockLookup(map.palette),
    { cutY },
  );
}

const faceCount = (buffers: MeshBuffers | null) =>
  buffers ? buffers.indices.length / 6 : 0;

// Нормали граней, у которых нормаль смотрит вверх (+y).
function topFaces(buffers: MeshBuffers): number {
  let count = 0;
  for (let i = 0; i < buffers.normals.length; i += 12) {
    if (buffers.normals[i + 1] === 1) count++;
  }
  return count;
}

const set = (at: [number, number, number], block: string): MapOp => ({
  op: 'setBlock',
  at,
  block,
});

describe('buildChunkMesh', () => {
  it('куб даёт 6 граней, обход каждой совпадает с её нормалью', () => {
    const { opaque } = mesh(mapWith([set([0, 0, 0], 'stone')]), [0, 0, 0]);

    expect(faceCount(opaque)).toBe(6);
    const { positions: p, normals: n, indices } = opaque!;
    for (let i = 0; i < indices.length; i += 3) {
      const [a, b, c] = [
        indices[i] * 3,
        indices[i + 1] * 3,
        indices[i + 2] * 3,
      ];
      const e1 = [p[b] - p[a], p[b + 1] - p[a + 1], p[b + 2] - p[a + 2]];
      const e2 = [p[c] - p[a], p[c + 1] - p[a + 1], p[c + 2] - p[a + 2]];
      const cross = [
        e1[1] * e2[2] - e1[2] * e2[1],
        e1[2] * e2[0] - e1[0] * e2[2],
        e1[0] * e2[1] - e1[1] * e2[0],
      ];
      const dot = cross[0] * n[a] + cross[1] * n[a + 1] + cross[2] * n[a + 2];
      expect(dot).toBeGreaterThan(0);
    }
  });

  it('соседние кубы не рисуют общую грань', () => {
    const map = mapWith([
      { op: 'fillBox', from: [0, 0, 0], to: [1, 0, 0], block: 'stone' },
    ]);
    expect(faceCount(mesh(map, [0, 0, 0]).opaque)).toBe(10);
  });

  it('скрывает грани и через границу чанков', () => {
    const map = mapWith([
      { op: 'fillBox', from: [15, 0, 0], to: [16, 0, 0], block: 'stone' },
    ]);
    expect(faceCount(mesh(map, [15, 0, 0]).opaque)).toBe(5);
    expect(faceCount(mesh(map, [16, 0, 0]).opaque)).toBe(5);
  });

  it('куб рядом со стеклом сохраняет грань, стекло уходит в прозрачную геометрию', () => {
    const map = mapWith([set([0, 0, 0], 'stone'), set([1, 0, 0], 'glass')]);
    const { opaque, transparent } = mesh(map, [0, 0, 0]);

    expect(faceCount(opaque)).toBe(6);
    // Грань стекла к непрозрачному кубу скрыта — её всё равно не видно.
    expect(faceCount(transparent)).toBe(5);
  });

  it('плита не скрывает боковую грань куба, а куб скрывает грань плиты', () => {
    const map = mapWith([set([0, 0, 0], 'stone'), set([1, 0, 0], 'wood_slab')]);
    const { opaque } = mesh(map, [0, 0, 0]);

    // Куб: 6 граней. Плита: 6 граней минус боковая к кубу.
    expect(faceCount(opaque)).toBe(11);
  });

  it('срез по высоте убирает верхние клетки и открывает верх нижних', () => {
    const map = mapWith([
      { op: 'fillBox', from: [0, 0, 0], to: [0, 3, 0], block: 'stone' },
    ]);
    const full = mesh(map, [0, 0, 0]).opaque!;
    const cut = mesh(map, [0, 0, 0], 1).opaque!;

    expect(topFaces(full)).toBe(1);
    expect(topFaces(cut)).toBe(1);
    // Столб из 2 кубов: 4 боковые × 2 + верх + низ.
    expect(faceCount(cut)).toBe(10);
    expect(Math.max(...cut.positions.filter((_, i) => i % 3 === 1))).toBe(2);
  });

  it('пустой чанк не даёт геометрии', () => {
    const map = mapWith([]);
    expect(mesh(map, [0, 0, 0])).toEqual({ opaque: null, transparent: null });
  });
});
