import { describe, expect, it } from 'vitest';
import {
  applyOp,
  createPalette,
  MemoryChunkStore,
  reachable,
  type MapState,
  type Occupant,
  type Vec3,
} from 'shared';
import type { PickedCells } from '../../../features/maps/editor/editorTools';
import { figureHover } from './figureHover';

// Каменный пол на y = 0 от 0 до 9: стоят на y = 1.
function floor(): MapState {
  const map = { store: new MemoryChunkStore(), palette: createPalette() };
  applyOp(map, {
    op: 'fillBox',
    from: [0, 0, 0],
    to: [9, 0, 9],
    block: 'stone',
  });
  return map;
}

// Курсор над серединой верхней грани блока пола в клетке x, z.
const over = (x: number, z: number): PickedCells => ({
  hit: [x, 0, z],
  place: [x, 1, z],
  point: [x + 0.5, 1, z + 0.5],
  normal: [0, 1, 0],
});

const start: Vec3 = [1, 1, 1];
const goblin: Occupant = { at: [3, 1, 1], size: 'medium', ally: false };

function hoverOf(cells: PickedCells, master: boolean, left = 15) {
  const map = floor();
  const reach = reachable(map, start, 'medium', left, [goblin]);
  return figureHover(map, reach, cells, 'medium', [goblin], master, start);
}

describe('figureHover', () => {
  it('игрок ходит только по достижимым клеткам и не на чужое место', () => {
    expect(hoverOf(over(1, 3), false)).toMatchObject({
      kind: 'move',
      anchor: [1, 1, 3],
      cost: 10,
    });
    // Дальше запаса и на гоблина — нельзя.
    expect(hoverOf(over(8, 8), false).kind).toBe('blocked');
    expect(hoverOf(over(3, 1), false).kind).toBe('blocked');
  });

  it('мастер ставит куда угодно, где свободно, — без пути и цены', () => {
    expect(hoverOf(over(8, 8), true)).toMatchObject({
      kind: 'place',
      anchor: [8, 1, 8],
      cost: 0,
      line: [],
    });
    expect(hoverOf(over(1, 3), true).kind).toBe('place');
    expect(hoverOf(over(3, 1), true).kind).toBe('blocked');
  });

  it('своя клетка — не ход и не постановка', () => {
    expect(hoverOf(over(1, 1), false).kind).toBe('blocked');
    expect(hoverOf(over(1, 1), true).kind).toBe('blocked');
  });
});
