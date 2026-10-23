import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { emptyVoxelModel } from 'shared';
import { voxelAt } from '../voxelGrid';
import { useVoxelEditor } from './useVoxelEditor';

const setup = () =>
  renderHook(() => useVoxelEditor(emptyVoxelModel(), '#ff0000'));

describe('useVoxelEditor', () => {
  it('ставит воксель на пол, к грани соседа, отменяет и возвращает', () => {
    const { result } = setup();
    act(() => result.current.strokeStart({ kind: 'floor', at: [3, 0, 3] }));
    act(() => result.current.strokeEnd());
    expect(voxelAt(result.current.grid, [3, 0, 3])).toBe(1);
    act(() =>
      result.current.strokeStart({
        kind: 'voxel',
        at: [3, 0, 3],
        normal: [0, 1, 0],
      }),
    );
    act(() => result.current.strokeEnd());
    expect(voxelAt(result.current.grid, [3, 1, 3])).toBe(1);
    act(() => result.current.undo());
    expect(voxelAt(result.current.grid, [3, 1, 3])).toBe(0);
    expect(result.current.canRedo).toBe(true);
    act(() => result.current.redo());
    expect(voxelAt(result.current.grid, [3, 1, 3])).toBe(1);
    expect(result.current.result().palette).toEqual(['#ff0000']);
  });

  it('стирание мазком — один шаг отмены', () => {
    const { result } = setup();
    act(() => result.current.setBrush(4));
    act(() => result.current.strokeStart({ kind: 'floor', at: [0, 0, 0] }));
    act(() => result.current.strokeEnd());
    act(() => result.current.setTool('erase'));
    act(() => result.current.setBrush(1));
    const hit = (x: number) =>
      ({ kind: 'voxel', at: [x, 0, 0], normal: [0, 1, 0] }) as const;
    act(() => result.current.strokeStart(hit(0)));
    act(() => result.current.strokeMove(hit(1)));
    act(() => result.current.strokeMove(hit(2)));
    act(() => result.current.strokeEnd());
    expect(result.current.grid.voxels.filter(Boolean)).toHaveLength(64 - 3);
    act(() => result.current.undo());
    expect(result.current.grid.voxels.filter(Boolean)).toHaveLength(64);
  });

  it('свойство клетки ставится и отменяется', () => {
    const { result } = setup();
    act(() => result.current.setTool('cells'));
    act(() => result.current.strokeStart({ kind: 'floor', at: [5, 0, 5] }));
    expect(result.current.grid.cells).toEqual({ '0,0,0': 'stand' });
    act(() => result.current.undo());
    expect(result.current.grid.cells).toEqual({});
  });

  it('урезание с вокселями спрашивает, отказ ничего не меняет', () => {
    const { result } = setup();
    act(() => {
      result.current.resize([2, 1, 1], () => true);
    });
    act(() => result.current.strokeStart({ kind: 'floor', at: [20, 0, 0] }));
    act(() => result.current.strokeEnd());
    let asked = 0;
    act(() => {
      result.current.resize([1, 1, 1], (lost) => {
        asked = lost;
        return false;
      });
    });
    expect(asked).toBe(1);
    expect(result.current.grid.size).toEqual([2, 1, 1]);
  });
});
