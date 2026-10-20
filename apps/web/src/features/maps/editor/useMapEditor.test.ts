import { act, fireEvent, renderHook } from '@testing-library/react';
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
