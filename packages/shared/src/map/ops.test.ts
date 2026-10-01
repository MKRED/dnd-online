import { describe, expect, it } from 'vitest';
import { MapOpError, parseMapOp } from './ops.js';

const limits = { maxOpVolume: 1000, maxCoordinate: 1000 };

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

  it('отклоняет координаты за пределом', () => {
    const input = { op: 'setBlock', at: [0, -1001, 0], block: 'stone' };
    expect(() => parseMapOp(input, limits)).toThrow('±1000');
  });

  it('принимает воздух как блок', () => {
    const input = { op: 'setBlock', at: [0, 0, 0], block: 'air' };
    expect(parseMapOp(input, limits)).toMatchObject({ block: 'air' });
  });
});
