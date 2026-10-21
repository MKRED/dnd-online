import { act, fireEvent, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreatureCards } from './useCreatureCards';

// Существа сцены здесь не нужны: запрос висит, выбор от него не зависит.
beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => new Promise<Response>(() => {})),
  );
});
afterEach(() => vi.unstubAllGlobals());

function setup() {
  const clearFigure = vi.fn();
  const hook = renderHook(
    ({ figureId }: { figureId: string | null }) =>
      useCreatureCards({
        gameId: 'g1',
        sceneId: 's1',
        master: true,
        state: null,
        refs: null,
        figures: null,
        canPick: true,
        figureId,
        clearFigure,
        reloadFigures: () => {},
      }),
    { initialProps: { figureId: null as string | null } },
  );
  const picked = () => hook.result.current.view.selectedId;
  const pick = (id: number) => act(() => hook.result.current.view.onPick!(id));
  return { hook, clearFigure, picked, pick };
}

describe('useCreatureCards: выбор существа', () => {
  it('щелчок по существу выбирает его и снимает выбор фигурки, повторный — снимает выбор', () => {
    const { clearFigure, picked, pick } = setup();
    pick(7);
    expect(picked()).toBe(7);
    expect(clearFigure).toHaveBeenCalledTimes(1);
    pick(7);
    expect(picked()).toBeNull();
  });

  it('Esc снимает выбор', () => {
    const { picked, pick } = setup();
    pick(7);
    act(() => {
      fireEvent.keyDown(window, { code: 'Escape' });
    });
    expect(picked()).toBeNull();
  });

  it('выбранная фигурка снимает выбор существа', () => {
    const { hook, picked, pick } = setup();
    pick(7);
    hook.rerender({ figureId: 'c1' });
    expect(picked()).toBeNull();
  });
});
