import { describe, expect, it } from 'vitest';
import { voxelIndex } from 'shared';
import { gridFromFields, gridToFields } from './voxelGrid';
import { voxelBounds, voxelFigureData } from './voxelBounds';
import { emptyVoxelModel } from 'shared';

const grid = () => gridFromFields({ ...emptyVoxelModel(), size: [1, 2, 1] });

describe('рамка вокселей модели монстра', () => {
  it('охватывает только закрашенные воксели', () => {
    const g = grid();
    g.palette = ['#ff0000'];
    g.voxels[voxelIndex(g.dims, 3, 0, 4)] = 1;
    g.voxels[voxelIndex(g.dims, 5, 20, 6)] = 1;
    expect(voxelBounds(g)).toEqual({ min: [3, 0, 4], max: [6, 21, 7] });
  });

  it('пустая модель — без рамки', () => {
    expect(voxelBounds(grid())).toBeNull();
    expect(voxelFigureData(emptyVoxelModel())).toBeNull();
  });

  it('данные фигуры считаются раз на модель', () => {
    const g = grid();
    g.palette = ['#00ff00'];
    g.voxels[0] = 1;
    const fields = gridToFields(g);
    const first = voxelFigureData(fields);
    expect(first?.box).toEqual({ min: [0, 0, 0], max: [1, 1, 1] });
    expect(voxelFigureData(fields)).toBe(first);
  });
});
