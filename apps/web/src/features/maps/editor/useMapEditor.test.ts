import { act, fireEvent, renderHook } from '@testing-library/react';
import {
  applyOps,
  createPalette,
  MemoryChunkStore,
  type SizedMapState,
  type Vec3,
} from 'shared';
import { describe, expect, it, vi } from 'vitest';
import { useMapEditor } from './useMapEditor';

function setup(objects = objectsMock()) {
  return renderHook(() =>
    useMapEditor({
      state: null,
      applyOps: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      walk: { pick: vi.fn(), preview: vi.fn() },
      objects,
      keysActive: true,
    }),
  );
}

function objectsMock() {
  return {
    pick: vi.fn(),
    span: 1,
    rotate: vi.fn(),
    remove: vi.fn(),
    escape: vi.fn(),
  };
}

const press = (code: string) =>
  act(() => {
    fireEvent.keyDown(window, { code });
  });

describe('useMapEditor, клавиши', () => {
  it('R поворачивает по кругу: 0 → 90 → 180 → 270 → 0', () => {
    const { result } = setup();
    const turns = [0, 1, 2, 3].map(() => {
      act(() => {
        fireEvent.keyDown(window, { code: 'KeyR', key: 'к' });
      });
      return result.current.rotation;
    });
    expect(turns).toEqual([90, 180, 270, 0]);
  });

  it('цифры выбирают инструменты в порядке полосы', () => {
    const { result } = setup();
    act(() => {
      fireEvent.keyDown(window, { code: 'Digit4' });
    });
    expect(result.current.tool).toBe('fill');
    act(() => {
      fireEvent.keyDown(window, { code: 'Digit7' });
    });
    expect(result.current.tool).toBe('walk');
  });

  it('у «Объектов» (8) R, Del и Esc уходят инструменту, а не блоку', () => {
    const objects = objectsMock();
    const { result } = setup(objects);
    press('Digit8');
    expect(result.current.tool).toBe('objects');
    press('KeyR');
    press('Delete');
    act(() => {
      fireEvent.keyDown(document.documentElement, { key: 'Escape' });
    });
    expect(objects.rotate).toHaveBeenCalledTimes(1);
    expect(objects.remove).toHaveBeenCalledTimes(1);
    expect(objects.escape).toHaveBeenCalledTimes(1);
    expect(result.current.rotation).toBe(0);
  });

  it('Del в других инструментах объекты не трогает', () => {
    const objects = objectsMock();
    setup(objects);
    press('Delete');
    expect(objects.remove).not.toHaveBeenCalled();
  });
});

describe('useMapEditor, ластик', () => {
  function setupWithMap() {
    const state: SizedMapState = {
      store: new MemoryChunkStore(),
      palette: createPalette(),
      size: { width: 10, depth: 10 },
    };
    applyOps(state, [
      { op: 'fillBox', from: [0, 0, 0], to: [4, 2, 0], block: 'stone' },
    ]);
    const apply = vi.fn();
    const hook = renderHook(() =>
      useMapEditor({
        state,
        applyOps: apply,
        undo: vi.fn(),
        redo: vi.fn(),
        objects: objectsMock(),
        keysActive: true,
      }),
    );
    return { ...hook, apply };
  }

  const onBlock = (cell: Vec3) => ({
    hit: cell,
    place: [cell[0], cell[1] + 1, cell[2]] as Vec3,
    point: [cell[0] + 0.5, cell[1] + 1, cell[2] + 0.5] as const,
    normal: [0, 1, 0] as Vec3,
  });

  it('клавиша ластика при ластике переключает режим по кругу', () => {
    const { result } = setupWithMap();
    press('Digit3');
    expect(result.current.tool).toBe('erase');
    expect(result.current.eraseMode).toBe('block');
    press('Digit3');
    expect(result.current.eraseMode).toBe('wall');
    press('Digit3');
    press('Digit3');
    press('Digit3');
    expect(result.current.eraseMode).toBe('block');
  });

  it('стена: два клика стирают прямоугольник вдоль оси одной операцией', () => {
    const { result, apply } = setupWithMap();
    press('Digit3');
    act(() => result.current.setEraseMode('wall'));
    act(() => result.current.sceneEditor?.onPick(onBlock([0, 0, 0])));
    expect(result.current.anchor?.cell).toEqual([0, 0, 0]);
    act(() => result.current.sceneEditor?.onPick(onBlock([4, 2, 1])));
    expect(apply).toHaveBeenCalledWith([
      { op: 'fillBox', from: [0, 0, 0], to: [4, 2, 0], block: 'air' },
    ]);
    expect(result.current.anchor).toBeNull();
  });

  it('стена: два клика по нижнему ряду стирают её до самого верха', () => {
    const { result, apply } = setupWithMap();
    press('Digit3');
    act(() => result.current.setEraseMode('wall'));
    act(() => result.current.sceneEditor?.onPick(onBlock([0, 0, 0])));
    act(() => result.current.sceneEditor?.onPick(onBlock([4, 0, 0])));
    expect(apply).toHaveBeenCalledWith([
      { op: 'fillBox', from: [0, 0, 0], to: [4, 2, 0], block: 'air' },
    ]);
  });

  it('блок: клик стирает один блок', () => {
    const { result, apply } = setupWithMap();
    press('Digit3');
    act(() => result.current.sceneEditor?.onPick(onBlock([1, 1, 0])));
    expect(apply).toHaveBeenCalledWith([
      { op: 'setBlock', at: [1, 1, 0], block: 'air' },
    ]);
  });

  it('область: два угла стирают коробку между ними', () => {
    const { result, apply } = setupWithMap();
    press('Digit3');
    act(() => result.current.setEraseMode('region'));
    act(() => result.current.sceneEditor?.onPick(onBlock([3, 1, 0])));
    act(() => result.current.sceneEditor?.onPick(onBlock([1, 0, 0])));
    expect(apply).toHaveBeenCalledWith([
      { op: 'fillBox', from: [1, 0, 0], to: [3, 1, 0], block: 'air' },
    ]);
  });

  it('связное: один клик стирает всю постройку', () => {
    const { result, apply } = setupWithMap();
    press('Digit3');
    act(() => result.current.setEraseMode('connected'));
    act(() => result.current.sceneEditor?.onPick(onBlock([2, 1, 0])));
    expect(apply).toHaveBeenCalledWith([
      { op: 'fillBox', from: [0, 0, 0], to: [4, 2, 0], block: 'air' },
    ]);
  });
});

describe('useMapEditor, выбор блока', () => {
  it('B открывает окно у инструментов блоков; пока оно открыто, цифры молчат', () => {
    const { result } = setup();
    press('KeyB');
    expect(result.current.pickerOpen).toBe(false);
    press('Digit2');
    press('KeyB');
    expect(result.current.pickerOpen).toBe(true);
    press('Digit4');
    expect(result.current.tool).toBe('place');
  });

  it('блок из окна встаёт первым в недавние', () => {
    const { result } = setup();
    act(() => result.current.pickBlock('wood'));
    act(() => result.current.pickBlock('brick_slab'));
    expect(result.current.block).toBe('brick_slab');
    expect(result.current.recentBlocks.slice(0, 2)).toEqual([
      'brick_slab',
      'wood',
    ]);
  });
});
