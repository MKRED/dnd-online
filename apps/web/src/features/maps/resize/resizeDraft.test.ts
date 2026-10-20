import {
  applyOps,
  createMapObjects,
  createPalette,
  emptyObjectRefs,
  MemoryChunkStore,
  type SizedMapState,
} from 'shared';
import { describe, expect, it } from 'vitest';
import {
  checkDraft,
  draftOp,
  EMPTY_DRAFT,
  lossLabel,
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

  it('считает объекты: Большой монстр у края уходит за границу всем местом', () => {
    const OGRE = '00000000-0000-4000-8000-000000000001';
    const state = {
      ...map(),
      objects: createMapObjects([
        {
          id: 1,
          at: [7, 1, 0],
          hidden: false,
          kind: 'monster',
          monsterId: OGRE,
          facing: 0,
        },
        { id: 2, at: [0, 1, 0], hidden: false, kind: 'start', facing: 0 },
      ]),
    };
    const refs = emptyObjectRefs();
    refs.monsters.set(OGRE, {
      name: 'Огр',
      size: 'large',
      role: 'regular',
      usable: true,
    });
    // Столб в x = 9 тоже уходит, огр [7–8] — только из-за своего размера.
    const keep = checkDraft(state, draft({ east: -2 }), limits, refs);
    expect(keep).toMatchObject({
      objectsOutside: 1,
      objectsRemoved: 0,
    });
    const del = checkDraft(state, draft({ east: -2 }, 'delete'), limits, refs);
    expect(del.objectsRemoved).toBe(1);
    // Без справочника огр считался бы Средним и остался бы внутри.
    expect(checkDraft(state, draft({ east: -2 }), limits).objectsOutside).toBe(
      0,
    );
    // Север срезает всегда: и старт, и огр стоят в z = 0.
    expect(
      checkDraft(state, draft({ north: -1 }), limits, refs).objectsRemoved,
    ).toBe(2);
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

describe('lossLabel', () => {
  it('пишет только ненулевые части', () => {
    expect(lossLabel(12, 2)).toBe('блоков: 12, объектов: 2');
    expect(lossLabel(0, 1)).toBe('объектов: 1');
    expect(lossLabel(3, 0)).toBe('блоков: 3');
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
