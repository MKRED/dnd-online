import { describe, expect, it } from 'vitest';
import { applyOp } from '../../applyOp.js';
import { MemoryChunkStore } from '../../chunkStore.js';
import type { Vec3 } from '../../coords.js';
import type { MapState } from '../../mapState.js';
import type { BlockOp } from '../../ops.js';
import { createPalette } from '../../palette.js';
import { creatureBody, type CreatureSize } from '../creature.js';
import {
  bodySeen,
  createMask,
  maskAdd,
  maskHas,
  maskSize,
  maskUnion,
  revealBody,
  visibleCells,
  type Viewer,
} from './index.js';

// Пол 21×21 на y = 0 вокруг начала координат; смотрящий — Средний на [0, 1, 0].
// MAP — клетки карты с запасом по высоте и вниз (под полом пусто, но и туда смотрим).
const MAP = { min: [-20, -5, -20], max: [20, 15, 20] } as const;
const FLOOR: BlockOp = {
  op: 'fillBox',
  from: [-10, 0, -10],
  to: [10, 0, 10],
  block: 'stone',
};

function mapWith(...ops: BlockOp[]): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  for (const op of ops) applyOp(map, op);
  return map;
}

function viewer(
  map: MapState,
  at: Vec3,
  rangeCells = 12,
  size: CreatureSize = 'medium',
): Viewer {
  return { body: creatureBody(map, at, size), rangeCells };
}

// Стена во всю высоту по x = 3 поперёк пола.
const WALL: BlockOp = {
  op: 'fillBox',
  from: [3, 1, -10],
  to: [3, 4, 10],
  block: 'stone',
};

describe('visibleCells', () => {
  it('sees the floor around and the air above it, within range', () => {
    const map = mapWith(FLOOR);
    const seen = visibleCells(map, viewer(map, [0, 1, 0], 4), MAP);
    expect(maskHas(seen, [4, 0, 4])).toBe(true);
    expect(maskHas(seen, [4, 1, -4])).toBe(true);
    // Дальность — Чебышёв: пятая клетка уже за пределом, даже по диагонали.
    expect(maskHas(seen, [5, 0, 0])).toBe(false);
    expect(maskHas(seen, [5, 1, 5])).toBe(false);
  });

  it('drops a fraction of the range: 23 ft is 4 cells', () => {
    const map = mapWith(FLOOR);
    const seen = visibleCells(map, viewer(map, [0, 1, 0], 23 / 5), MAP);
    expect(maskHas(seen, [4, 0, 0])).toBe(true);
    expect(maskHas(seen, [5, 0, 0])).toBe(false);
  });

  it('does not see through a wall, but sees its near face', () => {
    const map = mapWith(FLOOR, WALL);
    const seen = visibleCells(map, viewer(map, [0, 1, 0]), MAP);
    expect(maskHas(seen, [3, 1, 0])).toBe(true);
    expect(maskHas(seen, [4, 0, 0])).toBe(false);
    expect(maskHas(seen, [6, 0, 2])).toBe(false);
  });

  it('sees through a doorway into the room behind', () => {
    const door: BlockOp = {
      op: 'fillBox',
      from: [3, 1, 0],
      to: [3, 2, 0],
      block: 'air',
    };
    const map = mapWith(FLOOR, WALL, door);
    const seen = visibleCells(map, viewer(map, [0, 1, 0]), MAP);
    expect(maskHas(seen, [6, 0, 0])).toBe(true);
    // Вбок за стену проём не показывает.
    expect(maskHas(seen, [4, 0, 8])).toBe(false);
  });

  it('sees through glass', () => {
    const glass: BlockOp = { ...WALL, block: 'glass' };
    const map = mapWith(FLOOR, glass);
    const seen = visibleCells(map, viewer(map, [0, 1, 0]), MAP);
    expect(maskHas(seen, [6, 0, 0])).toBe(true);
  });

  it('sees the floor below from a balcony, past the edge', () => {
    const balcony: BlockOp = {
      op: 'fillBox',
      from: [-10, 1, -10],
      to: [0, 4, 10],
      block: 'stone',
    };
    const map = mapWith(FLOOR, balcony);
    const seen = visibleCells(map, viewer(map, [0, 5, 0]), MAP);
    expect(maskHas(seen, [6, 0, 0])).toBe(true);
    // Отступив от края, пол под балконом уже не видно: его закрывает сам балкон.
    const back = visibleCells(map, viewer(map, [-4, 5, 0]), MAP);
    expect(maskHas(back, [1, 0, 0])).toBe(false);
    expect(maskHas(back, [0, 5, 0])).toBe(true);
  });

  it('keeps to the map bounds', () => {
    const map = mapWith(FLOOR);
    const bounds = { min: [-10, 0, -10], max: [10, 9, 10] } as const;
    const seen = visibleCells(map, viewer(map, [0, 1, 0], 4), bounds);
    expect(maskHas(seen, [2, 0, 2])).toBe(true);
    // Под полом клеток карты нет — и без границ туда никто не смотрит.
    expect(maskHas(seen, [2, -1, 2])).toBe(false);
  });

  it('sees nothing with no range (unconscious)', () => {
    const map = mapWith(FLOOR);
    expect(maskSize(visibleCells(map, viewer(map, [0, 1, 0], 0), MAP))).toBe(0);
  });
});

describe('bodySeen', () => {
  it('sees a monster that peeks over a low wall', () => {
    const lowWall: BlockOp = { ...WALL, to: [3, 1, 10] };
    const map = mapWith(FLOOR, lowWall);
    const party = [viewer(map, [0, 1, 0])];
    const behind = creatureBody(map, [4, 1, 0], 'medium');
    expect(bodySeen(map, party, behind)).toBe(true);
    // Маленький за той же стеной — полное укрытие (map.md, таблица укрытий).
    const small = creatureBody(map, [4, 1, 0], 'small');
    expect(bodySeen(map, [viewer(map, [-2, 1, 0])], small)).toBe(false);
  });

  it('does not see a monster behind a full wall or out of range', () => {
    const map = mapWith(FLOOR, WALL);
    const party = [viewer(map, [0, 1, 0], 6)];
    expect(bodySeen(map, party, creatureBody(map, [5, 1, 0], 'medium'))).toBe(
      false,
    );
    const open = mapWith(FLOOR);
    expect(
      bodySeen(
        open,
        [viewer(open, [0, 1, 0], 6)],
        creatureBody(open, [7, 1, 0], 'medium'),
      ),
    ).toBe(false);
  });

  it('is seen if any one of the party sees it', () => {
    const map = mapWith(FLOOR, WALL);
    const body = creatureBody(map, [5, 1, 0], 'medium');
    const party = [viewer(map, [0, 1, 0]), viewer(map, [7, 1, 0])];
    expect(bodySeen(map, party, body)).toBe(true);
  });
});

describe('revealBody', () => {
  it('opens the cells of the body and the floor under it', () => {
    const map = mapWith(FLOOR);
    const mask = createMask();
    revealBody(map, mask, creatureBody(map, [2, 1, 2], 'large'));
    expect(maskHas(mask, [3, 3, 3])).toBe(true);
    expect(maskHas(mask, [3, 0, 3])).toBe(true);
    expect(maskHas(mask, [4, 1, 2])).toBe(false);
  });
});

describe('cell masks', () => {
  it('unites the sight of the party', () => {
    const a = createMask();
    const b = createMask();
    maskAdd(a, [0, 0, 0]);
    maskAdd(b, [0, 0, 0]);
    maskAdd(b, [-20, 3, 40]);
    maskUnion(a, b);
    expect(maskSize(a)).toBe(2);
    expect(maskHas(a, [-20, 3, 40])).toBe(true);
  });
});
