import { reachable } from 'shared';
import { describe, expect, it } from 'vitest';
import { cellsFromHit } from '../editor/editorTools';
import { floorWith } from './testMap';
import { walkHover } from './walkHover';

const UP = [0, 1, 0] as const;
// Клик по верху пола в клетке (x, z).
const floorAt = (x: number, z: number) =>
  cellsFromHit([x + 0.5, 0, z + 0.5], UP, false);

describe('walkHover', () => {
  // Стена по x = 2 от z = −3 до 3: до [4, 0, 0] — в обход, 50 футов.
  const map = floorWith({
    op: 'fillBox',
    from: [2, 0, -3],
    to: [2, 1, 3],
    block: 'stone',
  });
  const reach = reachable(map, [0, 0, 0], 'medium', 30);

  it('достижимая клетка — путь от фигурки и его цена', () => {
    const hover = walkHover(map, reach, floorAt(1, 2), 'medium');
    expect(hover.kind).toBe('move');
    expect(hover.anchor).toEqual([1, 0, 2]);
    expect(hover.cost).toBe(10);
    expect(hover.line).toHaveLength(3);
    expect(hover.line[0]).toEqual([0.5, 0.12, 0.5]);
    expect(hover.line.at(-1)).toEqual([1.5, 0.12, 2.5]);
  });

  it('стоять можно, но не дойти — переставить; без опоры — нельзя', () => {
    expect(walkHover(map, reach, floorAt(4, 0), 'medium').kind).toBe('place');
    const wallTop = cellsFromHit([2.5, 2, 0.5], UP, false);
    // На верх стены высотой 2 стать можно (места над ней хватает), но не дойти.
    expect(walkHover(map, reach, wallTop, 'medium').kind).toBe('place');
    // У бока стены Большой прижат к ней и стоит.
    const wallSide = cellsFromHit([2, 0.5, 0.5], [-1, 0, 0], false);
    expect(walkHover(map, [], wallSide, 'large')).toMatchObject({
      kind: 'place',
      anchor: [0, 0, 0],
    });
    const void_ = cellsFromHit([20.5, 0, 20.5], UP, true);
    expect(walkHover(map, [], void_, 'large').kind).toBe('blocked');
  });

  it('без фигурки (пустой reach) — только постановка', () => {
    expect(walkHover(map, [], floorAt(1, 2), 'medium').kind).toBe('place');
  });
});
