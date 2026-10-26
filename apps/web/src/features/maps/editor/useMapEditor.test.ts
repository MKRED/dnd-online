import { act, fireEvent, renderHook } from '@testing-library/react';
import {
  applyOps,
  createPalette,
  MemoryChunkStore,
  type SizedMapState,
  type Vec3,
} from 'shared';
import { describe, expect, it, vi } from 'vitest';
import type { ObjectChoice } from './objects/objectPlacement';
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
    extent: [1, 1, 1] as const,
    ghost: undefined,
    rotate: vi.fn(),
    remove: vi.fn(),
    escape: vi.fn(),
    choose: vi.fn(),
    settings: {
      choice: null as ObjectChoice | null,
      facing: 0 as const,
      hidden: false,
    },
    selected: null,
    scope: 'all' as const,
    moving: false,
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
    // Полоса: Просмотр, Строить, Ластик, Замена, Ход («Область» и «Коробка» — режимы).
    press('Digit4');
    expect(result.current.tool).toBe('replace');
    press('Digit5');
    expect(result.current.tool).toBe('walk');
  });

  it('2 при «Строить» — следующий режим: по одному → область → коробка → по одному', () => {
    const { result } = setup();
    const modes = [0, 1, 2, 3].map(() => {
      press('Digit2');
      return result.current.tool;
    });
    expect(modes).toEqual(['place', 'fill', 'hollow', 'place']);
  });

  it('у «Области» и «Коробки» высоты нет, у «Замены» — своя', () => {
    const { result } = setup();
    act(() => result.current.setHeight(3));
    act(() => result.current.setTool('fill'));
    expect(result.current.height).toBe(1);
    act(() => result.current.setTool('replace'));
    expect(result.current.height).toBe(3);
  });

  it('у «Поставить» (2) с выделенным объектом R, Del и Esc уходят объектам, а не блоку', () => {
    const objects = {
      ...objectsMock(),
      settings: {
        choice: { kind: 'start' as const },
        facing: 0 as const,
        hidden: false,
      },
      selected: { id: 1 } as unknown as null,
    };
    const { result } = setup(objects);
    press('Digit2');
    expect(result.current.tool).toBe('place');
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

  it('Esc без выделенного снимает ставящееся: «Поставить» пусто, щелчок ничего не ставит', () => {
    const objects = objectsMock();
    const state: SizedMapState = {
      store: new MemoryChunkStore(),
      palette: createPalette(),
      size: { width: 4, depth: 4 },
    };
    const ops = vi.fn();
    const { result } = renderHook(() =>
      useMapEditor({
        state,
        applyOps: ops,
        undo: vi.fn(),
        redo: vi.fn(),
        objects,
        keysActive: true,
      }),
    );
    press('Digit2');
    expect(result.current.placeEmpty).toBe(false);
    act(() => {
      fireEvent.keyDown(document.documentElement, { key: 'Escape' });
    });
    expect(objects.escape).not.toHaveBeenCalled();
    expect(objects.choose).toHaveBeenCalledWith(null);
    expect(result.current.placeEmpty).toBe(true);
    expect(result.current.sceneEditor?.idle).toBe(true);
    act(() =>
      result.current.sceneEditor?.onPick({ ground: [1, 0, 1] } as never),
    );
    expect(ops).not.toHaveBeenCalled();

    // Выбранный блок снова ставится.
    act(() => result.current.pickBlock('wood'));
    expect(result.current.placeEmpty).toBe(false);
    expect(result.current.sceneEditor?.idle).toBeUndefined();
  });

  it('«Перенести»: щелчок по клетке уходит объекту — и с блоком, и с пустым «Поставить»', () => {
    const idle = objectsMock();
    const moving = {
      ...idle,
      selected: { id: 1 } as unknown as null,
      moving: true,
    };
    const state: SizedMapState = {
      store: new MemoryChunkStore(),
      palette: createPalette(),
      size: { width: 4, depth: 4 },
    };
    const ops = vi.fn();
    const { result, rerender } = renderHook(
      ({ objects }) =>
        useMapEditor({
          state,
          applyOps: ops,
          undo: vi.fn(),
          redo: vi.fn(),
          objects,
          keysActive: true,
        }),
      { initialProps: { objects: idle } },
    );
    press('Digit2');
    const cells = { ground: [1, 0, 1] } as never;
    rerender({ objects: moving });
    act(() => result.current.sceneEditor?.onPick(cells));
    // Ничего не ставить: без выделения Esc снимает выбранный блок.
    rerender({ objects: idle });
    act(() => {
      fireEvent.keyDown(document.documentElement, { key: 'Escape' });
    });
    expect(result.current.placeEmpty).toBe(true);
    rerender({ objects: moving });
    act(() => result.current.sceneEditor?.onPick(cells));
    expect(idle.pick).toHaveBeenCalledTimes(2);
    expect(idle.escape).not.toHaveBeenCalled();
    expect(ops).not.toHaveBeenCalled();
  });

  it('у «Поставить» с блоком R поворачивает блок', () => {
    const objects = objectsMock();
    const { result } = setup(objects);
    press('Digit2');
    press('KeyR');
    expect(objects.rotate).not.toHaveBeenCalled();
    expect(result.current.rotation).toBe(90);
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
    expect(result.current.eraseMode).toBe('plane');
    press('Digit3');
    press('Digit3');
    press('Digit3');
    expect(result.current.eraseMode).toBe('block');
  });

  it('плоскость: два угла стены стирают прямоугольник одной операцией', () => {
    const { result, apply } = setupWithMap();
    press('Digit3');
    act(() => result.current.setEraseMode('plane'));
    act(() => result.current.sceneEditor?.onPick(onBlock([0, 0, 0])));
    expect(result.current.anchor?.cell).toEqual([0, 0, 0]);
    act(() => result.current.sceneEditor?.onPick(onBlock([4, 2, 1])));
    expect(apply).toHaveBeenCalledWith([
      { op: 'fillBox', from: [0, 0, 0], to: [4, 2, 0], block: 'air' },
    ]);
    expect(result.current.anchor).toBeNull();
  });

  it('плоскость: два угла на одном уровне стирают пол', () => {
    const { result, apply } = setupWithMap();
    press('Digit3');
    act(() => result.current.setEraseMode('plane'));
    act(() => result.current.sceneEditor?.onPick(onBlock([0, 2, 0])));
    act(() => result.current.sceneEditor?.onPick(onBlock([3, 2, 0])));
    expect(apply).toHaveBeenCalledWith([
      { op: 'fillBox', from: [0, 2, 0], to: [3, 2, 0], block: 'air' },
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

  it('блок и объект из окна встают первыми в недавние', () => {
    const objects = objectsMock();
    const { result } = setup(objects);
    act(() => result.current.setTool('place'));
    act(() => result.current.pickBlock('wood'));
    act(() => result.current.pickObject({ kind: 'start' }));
    act(() => result.current.pickBlock('brick_slab'));
    expect(result.current.block).toBe('brick_slab');
    expect(result.current.recentPlace.slice(0, 3)).toEqual([
      { type: 'block', name: 'brick_slab' },
      { type: 'object', choice: { kind: 'start' } },
      { type: 'block', name: 'wood' },
    ]);
    // Блок у «Поставить» сменяет объект.
    expect(objects.choose).toHaveBeenLastCalledWith(null);
  });
});
