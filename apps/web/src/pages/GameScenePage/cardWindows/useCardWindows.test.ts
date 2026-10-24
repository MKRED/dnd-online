import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_CARD_WINDOWS, useCardWindows } from './useCardWindows';

describe('useCardWindows', () => {
  it('открывает окна лесенкой, повторное открытие поднимает и разворачивает', () => {
    const { result } = renderHook(() => useCardWindows());
    act(() => result.current.open({ kind: 'creature', objectId: 1 }));
    act(() => result.current.open({ kind: 'character', id: 'c1' }));
    const [first, second] = result.current.windows;
    expect(second.x).toBeGreaterThan(first.x);
    act(() => result.current.update('m:1', { minimized: true }));
    act(() => result.current.open({ kind: 'creature', objectId: 1 }));
    expect(result.current.windows.map((w) => w.key)).toEqual(['c:c1', 'm:1']);
    expect(result.current.windows[1].minimized).toBe(false);
  });

  it(`больше ${MAX_CARD_WINDOWS} окон — самое старое закрывается`, () => {
    const { result } = renderHook(() => useCardWindows());
    for (let id = 1; id <= MAX_CARD_WINDOWS + 1; id++) {
      act(() => result.current.open({ kind: 'creature', objectId: id }));
    }
    expect(result.current.windows.map((w) => w.key)).toEqual([
      'm:2',
      'm:3',
      'm:4',
    ]);
    act(() => result.current.raise('m:2'));
    expect(result.current.windows.at(-1)?.key).toBe('m:2');
    act(() => result.current.close('m:2'));
    expect(result.current.windows).toHaveLength(2);
  });
});
