import { act, fireEvent, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMapEditor } from './useMapEditor';

function setup() {
  return renderHook(() =>
    useMapEditor({
      state: null,
      applyOps: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      walk: { pick: vi.fn(), preview: vi.fn() },
      keysActive: true,
    }),
  );
}

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
});
