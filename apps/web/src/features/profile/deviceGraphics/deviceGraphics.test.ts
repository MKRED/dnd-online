import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_USER_SETTINGS, GRAPHICS_PRESET_VALUES } from 'shared';
import {
  parseDeviceGraphics,
  pickGraphics,
  saveDeviceGraphics,
  startingGraphics,
  storedGraphics,
  subscribeGraphics,
} from './deviceGraphics';

afterEach(() => localStorage.clear());

describe('startingGraphics', () => {
  it('берёт графику, сохранённую в аккаунте', () => {
    const account = {
      ...DEFAULT_USER_SETTINGS,
      graphicsPreset: 'custom' as const,
      frameLimit: 30 as const,
    };
    expect(startingGraphics(account, true)).toEqual(pickGraphics(account));
  });

  it('в аккаунте умолчание: телефон — «Низкое», компьютер — «Среднее»', () => {
    expect(startingGraphics(DEFAULT_USER_SETTINGS, true)).toEqual({
      graphicsPreset: 'low',
      ...GRAPHICS_PRESET_VALUES.low,
    });
    expect(startingGraphics(DEFAULT_USER_SETTINGS, false)).toEqual({
      graphicsPreset: 'medium',
      ...GRAPHICS_PRESET_VALUES.medium,
    });
  });
});

describe('device storage', () => {
  it('битое и чужое читает как значения по умолчанию, пустое — как «своей нет»', () => {
    expect(parseDeviceGraphics(null)).toBeNull();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(parseDeviceGraphics('{нет')).toBeNull();
    expect(
      parseDeviceGraphics(
        JSON.stringify({ graphicsPreset: 'custom', renderScale: 3 }),
      ),
    ).toMatchObject({ graphicsPreset: 'custom', renderScale: 1 });
  });

  it('сохранённое видно подписчикам; снимок тот же, пока строка не менялась', () => {
    const listener = vi.fn();
    const stop = subscribeGraphics(listener);
    const low = {
      graphicsPreset: 'low' as const,
      ...GRAPHICS_PRESET_VALUES.low,
    };
    saveDeviceGraphics(low);
    expect(listener).toHaveBeenCalledTimes(1);
    expect(storedGraphics()).toEqual(low);
    expect(storedGraphics()).toBe(storedGraphics());
    stop();
    saveDeviceGraphics({ ...low, frameLimit: 60 });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
