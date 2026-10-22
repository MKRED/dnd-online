import { afterEach, describe, expect, it, vi } from 'vitest';
import { requestAnimationFrameAt } from './animationFrames';

describe('requestAnimationFrameAt', () => {
  afterEach(() => vi.useRealTimers());

  it('asks the scene for one frame per interval, however many animations ask', () => {
    vi.useFakeTimers();
    const invalidate = vi.fn();
    // Три призрака на одном кадре — один следующий кадр через 1/18 секунды.
    for (let i = 0; i < 3; i++) {
      requestAnimationFrameAt(invalidate, 18);
    }
    vi.advanceTimersByTime(50);
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(10);
    expect(invalidate).toHaveBeenCalledTimes(1);
    requestAnimationFrameAt(invalidate, 18);
    vi.advanceTimersByTime(60);
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it('does not animate at 0 fps and draws every frame at 60', () => {
    vi.useFakeTimers();
    const invalidate = vi.fn();
    requestAnimationFrameAt(invalidate, 0);
    vi.advanceTimersByTime(1000);
    expect(invalidate).not.toHaveBeenCalled();
    requestAnimationFrameAt(invalidate, 60);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });
});
