import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PickedCells } from '../../../features/maps/editor/editorTools';
import type { WalkHover } from '../../../features/maps/walkTest';
import { useFigureDragging } from './useFigureDragging';

const over = (x: number): PickedCells => ({
  hit: [x, 0, 0],
  place: [x, 1, 0],
  point: [x + 0.5, 1, 0.5],
  normal: [0, 1, 0],
});

const moveTo = (cells: PickedCells): WalkHover => ({
  kind: 'move',
  anchor: cells.place,
  body: { min: [0, 0, 0], max: [1, 1, 1] },
  line: [],
  cost: 5,
});

function setup(selectedId: string | null = null) {
  const select = vi.fn();
  const pick = vi.fn();
  const onDrag = vi.fn();
  const hook = renderHook(() =>
    useFigureDragging({ selectedId, select, preview: moveTo, pick, onDrag }),
  );
  return { hook, select, pick, onDrag };
}

afterEach(() => vi.useRealTimers());

describe('useFigureDragging', () => {
  it('тянут — позиции идут не чаще раза в 100 мс, отпустили — ход и «отпустили» остальным', () => {
    vi.useFakeTimers();
    const { hook, select, pick, onDrag } = setup();
    act(() => hook.result.current.grab('c1'));
    expect(select).toHaveBeenCalledWith('c1');
    act(() => hook.result.current.onHover(over(1)));
    act(() => hook.result.current.onHover(over(2)));
    expect(onDrag.mock.calls).toEqual([['c1', [1, 1, 0]]]);
    vi.advanceTimersByTime(150);
    act(() => hook.result.current.onHover(over(3)));
    expect(onDrag).toHaveBeenLastCalledWith('c1', [3, 1, 0]);
    act(() => hook.result.current.release(true));
    expect(onDrag).toHaveBeenLastCalledWith('c1', null);
    expect(pick).toHaveBeenCalledWith(over(3));
  });

  it('нажатие без сдвига по выбранной фигурке снимает выбор и ничего не шлёт', () => {
    const { hook, select, pick, onDrag } = setup('c1');
    act(() => hook.result.current.grab('c1'));
    act(() => hook.result.current.release(false));
    expect(select).toHaveBeenLastCalledWith(null);
    expect(pick).not.toHaveBeenCalled();
    expect(onDrag).not.toHaveBeenCalled();
  });
});
