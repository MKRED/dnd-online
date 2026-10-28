import { describe, expect, it, vi } from 'vitest';
import { createAimStore } from './aimStore';

const cells = { min: [0, 0, 0], max: [0, 1, 0] } as const;

describe('createAimStore', () => {
  it('уход с цели не снимает наведение на другую', () => {
    const aim = createAimStore();
    aim.hover('creature:1');
    aim.hover('creature:2');
    aim.leave('creature:1');
    expect(aim.hovered()).toBe('creature:2');
    aim.leave('creature:2');
    expect(aim.hovered()).toBeNull();
  });

  it('точки слоёв ищутся по ключу, слой заменяет свои целиком', () => {
    const aim = createAimStore();
    const listener = vi.fn();
    aim.subscribe(listener);
    aim.place('figures', new Map([['figure:a', { point: [1, 2, 3], cells }]]));
    aim.place(
      'creatures',
      new Map([['creature:5', { point: [4, 5, 6], cells }]]),
    );
    expect(aim.point('figure:a')?.point).toEqual([1, 2, 3]);
    expect(aim.point('creature:5')?.point).toEqual([4, 5, 6]);
    aim.place('figures', new Map());
    expect(aim.point('figure:a')).toBeNull();
    expect(listener).toHaveBeenCalledTimes(3);
  });
});
