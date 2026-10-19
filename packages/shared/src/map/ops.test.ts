import { describe, expect, it } from 'vitest';
import { MapOpError, parseMapOp } from './ops.js';

const limits = { maxOpVolume: 1000, maxSize: 100, maxHeight: 20 };

describe('parseMapOp', () => {
  it('принимает корректную операцию', () => {
    const input = {
      op: 'fillBox',
      from: [0, 0, 0],
      to: [9, 0, 9],
      block: 'stone_stairs',
      rotation: 90,
    };
    expect(parseMapOp(input, limits)).toEqual(input);
  });

  it.each([
    ['не объект', 'fillBox'],
    ['неизвестная операция', { op: 'explode' }],
    ['дробные координаты', { op: 'setBlock', at: [0.5, 0, 0], block: 'stone' }],
    ['две координаты', { op: 'setBlock', at: [0, 0], block: 'stone' }],
    ['неизвестный блок', { op: 'setBlock', at: [0, 0, 0], block: 'mithril' }],
    [
      'поворот не кратен 90',
      { op: 'setBlock', at: [0, 0, 0], block: 'stone', rotation: 45 },
    ],
    [
      'replace без match',
      { op: 'replace', from: [0, 0, 0], to: [1, 1, 1], block: 'dirt' },
    ],
  ])('отклоняет: %s', (_, input) => {
    expect(() => parseMapOp(input, limits)).toThrow(MapOpError);
  });

  it('отклоняет операцию больше лимита объёма', () => {
    const input = {
      op: 'fillBox',
      from: [0, 0, 0],
      to: [10, 9, 9],
      block: 'stone',
    };
    expect(() => parseMapOp(input, limits)).toThrow('1100 клеток');
  });

  it.each([
    ['отрицательная', [0, -1, 0], 'меньше нуля'],
    ['x не меньше наибольшего размера', [100, 0, 0], 'меньше 100'],
    ['z не меньше наибольшего размера', [0, 0, 100], 'меньше 100'],
    ['y не меньше предела высоты', [0, 20, 0], 'меньше 20'],
  ])('отклоняет координаты: %s', (_, at, message) => {
    const input = { op: 'setBlock', at, block: 'stone' };
    expect(() => parseMapOp(input, limits)).toThrow(message);
  });

  it('принимает воздух как блок', () => {
    const input = { op: 'setBlock', at: [0, 0, 0], block: 'air' };
    expect(parseMapOp(input, limits)).toMatchObject({ block: 'air' });
  });

  describe('resize', () => {
    it('принимает стороны и выбрасывает нули', () => {
      const input = {
        op: 'resize',
        grow: { west: 4, east: -2, down: 3, north: 0 },
        cut: 'delete',
      };
      expect(parseMapOp(input, limits)).toEqual({
        op: 'resize',
        grow: { west: 4, east: -2, down: 3 },
        cut: 'delete',
      });
    });

    it('объёмом не ограничен', () => {
      const input = { op: 'resize', grow: { east: 100, south: 100 } };
      expect(parseMapOp(input, limits)).toMatchObject({ op: 'resize' });
    });

    it.each([
      ['без grow', { op: 'resize' }],
      ['grow — список', { op: 'resize', grow: [1, 2] }],
      ['неизвестная сторона', { op: 'resize', grow: { up: 1 } }],
      ['дробное число', { op: 'resize', grow: { east: 1.5 } }],
      ['больше наибольшего размера', { op: 'resize', grow: { east: 101 } }],
      ['низ больше предела высоты', { op: 'resize', grow: { down: 21 } }],
      ['неизвестный cut', { op: 'resize', grow: { east: -1 }, cut: 'hide' }],
    ])('отклоняет: %s', (_, input) => {
      expect(() => parseMapOp(input, limits)).toThrow(MapOpError);
    });
  });
});
