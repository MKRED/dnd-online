import {
  applyOps,
  createPalette,
  MemoryChunkStore,
  type SizedMapState,
} from 'shared';
import { describe, expect, it } from 'vitest';
import {
  checkDraft,
  draftOp,
  EMPTY_DRAFT,
  type ResizeDraft,
} from './resizeDraft';

const limits = { maxSize: 40, maxHeight: 8 };

// Карта 10 × 10: камень в западном углу и столб у восточного края.
function map(): SizedMapState {
  const state: SizedMapState = {
    store: new MemoryChunkStore(),
    palette: createPalette(),
    size: { width: 10, depth: 10 },
  };
  applyOps(state, [
    { op: 'setBlock', at: [0, 0, 0], block: 'stone' },
    { op: 'fillBox', from: [9, 0, 5], to: [9, 3, 5], block: 'stone' },
  ]);
  return state;
}

const draft = (
  grow: Partial<ResizeDraft['grow']>,
  cut: ResizeDraft['cut'] = 'keep',
): ResizeDraft => ({ grow: { ...EMPTY_DRAFT.grow, ...grow }, cut });

describe('checkDraft', () => {
  it('пустой черновик нельзя применить, но и ошибки нет', () => {
    expect(checkDraft(map(), EMPTY_DRAFT, limits)).toMatchObject({
      after: { width: 10, depth: 10 },
      unchanged: true,
      error: null,
      removed: 0,
    });
  });

  it('считает удаляемое: срезанное всегда, за границей — только при «delete»', () => {
    const keep = checkDraft(map(), draft({ west: -1, east: -1 }), limits);
    expect(keep).toMatchObject({ outside: 4, removed: 1, error: null });
    const del = checkDraft(
      map(),
      draft({ west: -1, east: -1 }, 'delete'),
      limits,
    );
    expect(del.removed).toBe(5);
  });

  it('отклоняет пустую, слишком большую и слишком высокую карту', () => {
    expect(checkDraft(map(), draft({ east: -10 }), limits).error).toMatch(
      /хотя бы одна клетка/,
    );
    expect(checkDraft(map(), draft({ south: 31 }), limits).error).toMatch(
      /предела 40 × 40/,
    );
    expect(checkDraft(map(), draft({ down: 5 }), limits).error).toMatch(
      /выше предела высоты: 8/,
    );
  });
});

describe('draftOp', () => {
  it('шлёт только ненулевые стороны и cut, если есть что скрыть', () => {
    expect(draftOp(draft({ down: 2 }), 0)).toEqual({
      op: 'resize',
      grow: { down: 2 },
    });
    expect(draftOp(draft({ east: -1 }, 'delete'), 4)).toEqual({
      op: 'resize',
      grow: { east: -1 },
      cut: 'delete',
    });
  });
});
