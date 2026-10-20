import { act, renderHook } from '@testing-library/react';
import { useRef } from 'react';
import {
  createMapObjects,
  createPalette,
  emptyRefsView,
  MemoryChunkStore,
  type MapObject,
  type PackedChangeset,
} from 'shared';
import { describe, expect, it, vi } from 'vitest';
import type { MapViewState } from './mapStateFromChunks';
import { useMapEdits, type EditableCopy } from './useMapEdits';

const start = (id: number): MapObject => ({
  id,
  at: [id, 0, 0],
  hidden: false,
  kind: 'start',
  facing: 0,
});

const state: MapViewState = {
  store: new MemoryChunkStore(),
  palette: createPalette(),
  size: { width: 8, depth: 8 },
  objects: createMapObjects([], 1),
};

// Правка: поставлен старт с номером id.
const placed = (id: number): PackedChangeset => ({
  cells: [],
  paletteAdded: [],
  objects: [{ id, before: null, after: start(id) }],
});

function setup() {
  const onApplied = vi.fn<(next: EditableCopy, seq: number) => void>();
  const refresh = vi.fn();
  const api = { applyOps: vi.fn(), undo: vi.fn(), redo: vi.fn() };
  const { result } = renderHook(() => {
    const seqRef = useRef(0);
    // Копия не перерисовывается между правками: так приходят два сообщения сокета подряд.
    const edits = useMapEdits({
      copy: { state, refs: emptyRefsView() },
      seqRef,
      onApplied,
      refresh,
      api,
    });
    return { edits, seqRef };
  });
  return { result, onApplied, refresh };
}

describe('useMapEdits', () => {
  it('две правки подряд до перерисовки ложатся одна на другую', () => {
    const { result, onApplied, refresh } = setup();
    act(() => {
      void result.current.edits.receive(1, placed(1), emptyRefsView());
      void result.current.edits.receive(2, placed(2), emptyRefsView());
    });
    expect(onApplied).toHaveBeenCalledTimes(2);
    const [last, seq] = onApplied.mock.calls[1];
    expect(seq).toBe(2);
    expect([...last.state.objects.byId.keys()]).toEqual([1, 2]);
    expect(refresh).not.toHaveBeenCalled();
  });

  it('уже применённую пропускает, после пропуска перечитывает', () => {
    const { result, onApplied, refresh } = setup();
    act(() => {
      void result.current.edits.receive(1, placed(1), emptyRefsView());
      // Ответ на свою правку после того же сообщения сокета.
      void result.current.edits.receive(1, placed(1), emptyRefsView());
    });
    expect(onApplied).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    act(() => {
      void result.current.edits.receive(3, placed(3), emptyRefsView());
    });
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(result.current.seqRef.current).toBe(1);
  });

  it('правку, которая не легла на копию, не применяет, а перечитывает', () => {
    const { result, onApplied, refresh } = setup();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    act(() => {
      void result.current.edits.receive(
        1,
        // Убирает объект, которого в копии нет, — конфликт.
        {
          cells: [],
          paletteAdded: [],
          objects: [{ id: 5, before: start(5), after: null }],
        },
        emptyRefsView(),
      );
    });
    expect(onApplied).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});
