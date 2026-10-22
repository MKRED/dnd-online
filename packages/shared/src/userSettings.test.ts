import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_SETTINGS,
  GRAPHICS_PRESET_VALUES,
  readUserSettings,
} from './userSettings.js';

describe('readUserSettings', () => {
  it('пустые и битые данные — настройки по умолчанию', () => {
    expect(readUserSettings({})).toEqual(DEFAULT_USER_SETTINGS);
    expect(readUserSettings(null)).toEqual(DEFAULT_USER_SETTINGS);
    expect(readUserSettings([1])).toEqual(DEFAULT_USER_SETTINGS);
    expect(readUserSettings({ facingMarker: 'arrow' })).toEqual(
      DEFAULT_USER_SETTINGS,
    );
    // «Высокое» пока недоступно — как и неизвестный набор, читается по умолчанию.
    expect(readUserSettings({ graphicsPreset: 'high' })).toEqual(
      DEFAULT_USER_SETTINGS,
    );
    expect(readUserSettings({ graphicsPreset: 'ultra' })).toEqual(
      DEFAULT_USER_SETTINGS,
    );
    expect(readUserSettings({ healthMarkStyle: 'neon' })).toEqual(
      DEFAULT_USER_SETTINGS,
    );
  });

  it('берёт допустимые значения и отбрасывает лишние поля', () => {
    expect(
      readUserSettings({
        facingMarker: 'compass',
        graphicsPreset: 'low',
        healthMarkStyle: 'ribbon',
        extra: 1,
      }),
    ).toEqual({
      facingMarker: 'compass',
      graphicsPreset: 'low',
      ...GRAPHICS_PRESET_VALUES.low,
      healthMarkStyle: 'ribbon',
    });
  });

  it('прежнее «качество графики» читается как набор', () => {
    expect(readUserSettings({ graphicsQuality: 'low' })).toMatchObject({
      graphicsPreset: 'low',
      animationFps: 0,
      creatureModels: 'none',
    });
    // Новый набор важнее старого поля, которое осталось в базе.
    expect(
      readUserSettings({ graphicsQuality: 'low', graphicsPreset: 'medium' }),
    ).toMatchObject({ graphicsPreset: 'medium', animationFps: 18 });
  });

  it('у набора значения его, сохранённые не важны', () => {
    expect(
      readUserSettings({ graphicsPreset: 'medium', animationFps: 5 }),
    ).toMatchObject({ animationFps: 18 });
  });

  it('у своих настроек — сохранённые, каждое проверено', () => {
    expect(
      readUserSettings({
        graphicsPreset: 'custom',
        animationFps: 30,
        creatureModels: 'party',
        renderScale: 0.5,
        antialias: false,
        frameLimit: 60,
      }),
    ).toMatchObject({
      graphicsPreset: 'custom',
      animationFps: 30,
      creatureModels: 'party',
      renderScale: 0.5,
      antialias: false,
      frameLimit: 60,
    });
    expect(
      readUserSettings({
        graphicsPreset: 'custom',
        animationFps: 61,
        creatureModels: 'some',
        renderScale: 0.3,
        antialias: 'yes',
        frameLimit: 45,
      }),
    ).toEqual({ ...DEFAULT_USER_SETTINGS, graphicsPreset: 'custom' });
    expect(
      readUserSettings({ graphicsPreset: 'custom', animationFps: 2.5 }),
    ).toMatchObject({ animationFps: 18 });
  });
});
