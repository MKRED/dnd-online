import { creatureBody } from 'shared';
import { describe, expect, it } from 'vitest';
import { cellsFromHit } from '../editor/editorTools';
import { floorWith } from './testMap';
import { walkBody, walkTarget } from './walkTarget';

const UP = [0, 1, 0] as const;

describe('walkTarget', () => {
  it('клик по верху блока ставит фигурку над ним', () => {
    const map = floorWith();
    const cells = cellsFromHit([0.5, 0, 0.5], UP, false);
    expect(walkTarget(map, cells, 'medium')).toEqual({
      anchor: [0, 0, 0],
      ok: true,
    });
  });

  it('клик по плите или ступени ставит фигурку в ту же клетку', () => {
    const map = floorWith(
      { op: 'setBlock', at: [0, 0, 0], block: 'stone_slab' },
      { op: 'setBlock', at: [2, 0, 0], block: 'wood_stairs' },
    );
    const slab = cellsFromHit([0.5, 0.5, 0.5], UP, false);
    expect(walkTarget(map, slab, 'medium').anchor).toEqual([0, 0, 0]);
    // Верх верхней ступени — на y = 1, но фигурка стоит в клетке лестницы.
    const step = cellsFromHit([2.5, 1, 0.2], UP, false);
    expect(walkTarget(map, step, 'medium')).toEqual({
      anchor: [2, 0, 0],
      ok: true,
    });
  });

  it('клик по боку стены ставит фигурку рядом со стеной', () => {
    const map = floorWith({ op: 'setBlock', at: [0, 0, 0], block: 'stone' });
    const cells = cellsFromHit([1, 0.5, 0.5], [1, 0, 0], false);
    expect(walkTarget(map, cells, 'medium')).toEqual({
      anchor: [1, 0, 0],
      ok: true,
    });
  });

  it('без опоры или в тесноте — ok = false', () => {
    const map = floorWith({
      op: 'fillBox',
      from: [-6, 1, -6],
      to: [6, 1, 6],
      block: 'stone',
    });
    // Потолок на высоте 1: Маленький помещается, Средний — нет.
    const cells = cellsFromHit([0.5, 0, 0.5], UP, false);
    expect(walkTarget(map, cells, 'small').ok).toBe(true);
    expect(walkTarget(map, cells, 'medium')).toEqual({
      anchor: [0, 0, 0],
      ok: false,
    });
    // Земля без блоков под ней.
    const ground = cellsFromHit([20.5, 0, 20.5], UP, true);
    expect(walkTarget(map, ground, 'medium').ok).toBe(false);
  });

  it('тело на негодном месте не всплывает на блок, задевающий основание', () => {
    // Дверь шириной 1 в стене по z = 3: основание Большого 2×2 задевает стену.
    const map = floorWith(
      { op: 'fillBox', from: [-6, 0, 3], to: [6, 2, 3], block: 'stone' },
      { op: 'fillBox', from: [0, 0, 3], to: [0, 1, 3], block: 'air' },
      { op: 'setBlock', at: [0, 0, 4], block: 'stone_slab' },
    );
    const cells = cellsFromHit([0.5, 0, 3.5], UP, false);
    const target = walkTarget(map, cells, 'large');
    expect(target.ok).toBe(false);
    // creatureBody ставит ноги на верх стены — отсюда всплытие на блок.
    expect(creatureBody(map, target.anchor, 'large').min[1]).toBe(1);
    // Плита в основании поднимает ноги на ½, стена — нет: она препятствие, не опора.
    expect(walkBody(map, target.anchor, 'large')).toEqual({
      min: [0, 0.5, 3],
      max: [2, 3.5, 5],
    });
    // На годном месте — то же тело, что у creatureBody.
    expect(walkBody(map, [0, 0, -3], 'large')).toEqual(
      creatureBody(map, [0, 0, -3], 'large'),
    );
  });

  it('курсор держит середину основания крупных существ', () => {
    const map = floorWith();
    const cells = cellsFromHit([0.5, 0, 0.5], UP, false);
    expect(walkTarget(map, cells, 'large').anchor).toEqual([0, 0, 0]);
    expect(walkTarget(map, cells, 'huge').anchor).toEqual([-1, 0, -1]);
    expect(walkTarget(map, cells, 'gargantuan').anchor).toEqual([-1, 0, -1]);
  });
});
