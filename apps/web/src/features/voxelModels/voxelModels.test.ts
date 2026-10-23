import { describe, expect, it } from 'vitest';
import { emptyVoxelModel, voxelIndex, type Vec3 } from 'shared';
import { brushIndices } from './voxelBrush';
import {
  cellKind,
  gridFromFields,
  gridToFields,
  lostByResize,
  paletteValue,
  resizeGrid,
  rotateGrid,
  voxelAt,
  type VoxelGrid,
} from './voxelGrid';
import { applyStep } from './voxelHistory';
import { buildCellMesh, touchedCells } from './voxelMesh';
import { castVoxelRay, placeTarget } from './voxelRaycast';

const grid = (size: Vec3 = [1, 1, 1]): VoxelGrid =>
  resizeGrid(gridFromFields(emptyVoxelModel()), size);

const paint = (g: VoxelGrid, at: Vec3, color = '#ff0000') => {
  g.voxels[voxelIndex(g.dims, ...at)] = paletteValue(g, color)!;
};

describe('сетка модели', () => {
  it('поля записи туда и обратно, неиспользуемые цвета уходят', () => {
    const g = grid([2, 1, 1]);
    paletteValue(g, '#000000');
    paint(g, [20, 3, 4], '#00ff00');
    const fields = gridToFields(g);
    expect(fields.palette).toEqual(['#00ff00']);
    const back = gridFromFields(fields);
    expect(voxelAt(back, [20, 3, 4])).toBe(1);
    expect(back.voxels.filter(Boolean)).toHaveLength(1);
  });

  it('свойство клетки: своё, иначе препятствие с вокселями и свободно без', () => {
    const g = grid([2, 1, 1]);
    paint(g, [1, 1, 1]);
    expect(cellKind(g, [0, 0, 0])).toBe('obstacle');
    expect(cellKind(g, [1, 0, 0])).toBe('free');
    g.cells['0,0,0'] = 'stand';
    expect(cellKind(g, [0, 0, 0])).toBe('stand');
  });

  it('урезание считает потерянные воксели и отрезает клетки', () => {
    const g = grid([2, 1, 1]);
    paint(g, [1, 0, 0]);
    paint(g, [17, 0, 0]);
    g.cells['1,0,0'] = 'free';
    expect(lostByResize(g, [1, 1, 1])).toBe(1);
    const small = resizeGrid(g, [1, 2, 1]);
    expect(voxelAt(small, [1, 0, 0])).toBe(1);
    expect(small.voxels.filter(Boolean)).toHaveLength(1);
    expect(small.cells).toEqual({});
  });

  it('поворот по часовой: север уходит на восток, размер и клетки — тоже', () => {
    const g = grid([2, 1, 1]);
    // Воксель у северного края (z = 0) западной клетки.
    paint(g, [0, 0, 0]);
    g.cells['0,0,0'] = 'stand';
    const turned = rotateGrid(g);
    expect(turned.size).toEqual([1, 1, 2]);
    expect(voxelAt(turned, [15, 0, 0])).toBe(1);
    expect(turned.cells).toEqual({ '0,0,0': 'stand' });
    const twice = rotateGrid(turned);
    expect(voxelAt(twice, [31, 0, 15])).toBe(1);
    expect(twice.cells).toEqual({ '1,0,0': 'stand' });
  });

  it('палитра полна на 255 цветах', () => {
    const g = grid();
    for (let i = 0; i < 255; i++)
      paletteValue(g, `#0000${i.toString(16).padStart(2, '0')}`);
    expect(paletteValue(g, '#ffffff')).toBeNull();
    expect(paletteValue(g, '#000001')).toBe(2);
  });
});

describe('кисть и отмена', () => {
  it('кисть прилипает к своей сетке, зеркало удваивает', () => {
    const g = grid();
    expect(brushIndices(g, [5, 5, 5], 4, { x: false, z: false })).toHaveLength(
      64,
    );
    const mirrored = brushIndices(g, [0, 0, 0], 1, { x: true, z: true });
    expect(mirrored.sort((a, b) => a - b)).toEqual(
      [
        voxelIndex(g.dims, 0, 0, 0),
        voxelIndex(g.dims, 15, 0, 0),
        voxelIndex(g.dims, 0, 0, 15),
        voxelIndex(g.dims, 15, 0, 15),
      ].sort((a, b) => a - b),
    );
  });

  it('шаг мазка отменяется и возвращается', () => {
    const g = grid();
    const indices = [1, 2];
    const step = {
      kind: 'voxels' as const,
      indices,
      before: Uint8Array.from([0, 0]),
      after: Uint8Array.from([1, 1]),
    };
    applyStep(g, step, 'redo');
    expect(g.voxels[2]).toBe(1);
    applyStep(g, step, 'undo');
    expect(g.voxels[2]).toBe(0);
  });
});

describe('луч по вокселям', () => {
  it('попадает в первый воксель и грань, откуда пришёл', () => {
    const g = grid();
    paint(g, [4, 0, 4]);
    paint(g, [8, 0, 4]);
    const hit = castVoxelRay(g, [20, 0.5, 4.5], [-1, 0, 0], 16);
    expect(hit).toEqual({ kind: 'voxel', at: [8, 0, 4], normal: [1, 0, 0] });
    expect(placeTarget(hit!)).toEqual([9, 0, 4]);
  });

  it('сверху вниз мимо вокселей — в пол; срезанный воксель пропускается', () => {
    const g = grid();
    paint(g, [3, 5, 3]);
    expect(castVoxelRay(g, [3.5, 30, 3.5], [0, -1, 0], 16)).toMatchObject({
      kind: 'voxel',
      at: [3, 5, 3],
      normal: [0, 1, 0],
    });
    expect(castVoxelRay(g, [3.5, 30, 3.5], [0, -1, 0], 5)).toEqual({
      kind: 'floor',
      at: [3, 0, 3],
    });
    expect(castVoxelRay(g, [30, 30, 30], [0, 1, 0], 16)).toBeNull();
  });
});

describe('сетка отрисовки', () => {
  it('у одного вокселя 6 граней, у соседей общая скрыта, срез открывает верх', () => {
    const g = grid();
    paint(g, [0, 0, 0]);
    expect(buildCellMesh(g, [0, 0, 0], 16).positions.length).toBe(6 * 6 * 3);
    paint(g, [0, 1, 0]);
    expect(buildCellMesh(g, [0, 0, 0], 16).positions.length).toBe(10 * 6 * 3);
    expect(buildCellMesh(g, [0, 0, 0], 1).positions.length).toBe(6 * 6 * 3);
  });

  it('правка на краю клетки трогает и соседнюю', () => {
    const g = grid([2, 1, 1]);
    const cells = touchedCells(g, [voxelIndex(g.dims, 15, 0, 0)]);
    expect(cells).toEqual(
      expect.arrayContaining([
        [0, 0, 0],
        [1, 0, 0],
      ]),
    );
    expect(cells).toHaveLength(2);
  });
});
