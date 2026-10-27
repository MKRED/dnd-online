import { describe, expect, it } from 'vitest';
import {
  HIDDEN_TURN,
  stripCapacity,
  stripSlots,
  withHiddenTurn,
} from './stripSlots';

const order = ['a', 'b', 'c', 'd', 'e'];

describe('stripSlots', () => {
  it('пока бросают инициативу — бросившие по очереди, потом остальные', () => {
    expect(stripSlots(['b', 'a'], ['c'], null, 10)).toEqual({
      ids: ['b', 'a', 'c'],
      acted: null,
      more: 0,
    });
  });

  it('первым — последний ходивший, за ним текущий и следующие по кругу', () => {
    expect(stripSlots(order, [], 'c', 10)).toEqual({
      ids: ['b', 'c', 'd', 'e', 'a'],
      acted: 'b',
      more: 0,
    });
    // У первого в раунде последний ходивший — последний в очереди.
    expect(stripSlots(order, [], 'a', 10).ids).toEqual([
      'e',
      'a',
      'b',
      'c',
      'd',
    ]);
  });

  it('что не влезло — в счётчике', () => {
    expect(stripSlots(order, ['x'], 'c', 3)).toEqual({
      ids: ['b', 'c', 'd'],
      acted: 'b',
      more: 3,
    });
    // На одно место — только текущий.
    expect(stripSlots(order, [], 'c', 1)).toEqual({
      ids: ['c'],
      acted: null,
      more: 4,
    });
  });

  it('первый ход боя — начинаем с текущего', () => {
    expect(stripSlots(order, [], 'a', 10, true)).toEqual({
      ids: order,
      acted: null,
      more: 0,
    });
  });

  it('один в очереди — без «ходившего»', () => {
    expect(stripSlots(['a'], [], 'a', 5)).toEqual({
      ids: ['a'],
      acted: null,
      more: 0,
    });
  });
});

describe('stripCapacity', () => {
  it('все влезли — без «+N»', () => {
    expect(stripCapacity(70 + 52 * 5, 5, 0)).toBe(5);
  });

  it('не влезли — место под «+N»', () => {
    expect(stripCapacity(70 + 52 * 5, 6, 0)).toBe(4);
    expect(stripCapacity(70 + 52 * 5 + 40, 6, 40)).toBe(4);
  });

  it('хотя бы один — текущий', () => {
    expect(stripCapacity(100, 9, 0)).toBe(1);
  });
});

describe('withHiddenTurn', () => {
  it('«Ход противника» — после последнего видимого перед ним', () => {
    expect(withHiddenTurn(['a', 'b'], { after: 'a' })).toEqual([
      'a',
      HIDDEN_TURN,
      'b',
    ]);
    expect(withHiddenTurn(['a', 'b'], { after: null })).toEqual([
      HIDDEN_TURN,
      'a',
      'b',
    ]);
    expect(withHiddenTurn(['a'], null)).toEqual(['a']);
  });
});
