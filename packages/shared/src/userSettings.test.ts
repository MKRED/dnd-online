import { describe, expect, it } from 'vitest';
import { DEFAULT_USER_SETTINGS, readUserSettings } from './userSettings.js';

describe('readUserSettings', () => {
  it('пустые и битые данные — настройки по умолчанию', () => {
    expect(readUserSettings({})).toEqual(DEFAULT_USER_SETTINGS);
    expect(readUserSettings(null)).toEqual(DEFAULT_USER_SETTINGS);
    expect(readUserSettings([1])).toEqual(DEFAULT_USER_SETTINGS);
    expect(readUserSettings({ facingMarker: 'arrow' })).toEqual(
      DEFAULT_USER_SETTINGS,
    );
    // «Высокое» качество пока недоступно — как и неизвестное, читается по умолчанию.
    expect(readUserSettings({ graphicsQuality: 'high' })).toEqual(
      DEFAULT_USER_SETTINGS,
    );
    expect(readUserSettings({ graphicsQuality: 'ultra' })).toEqual(
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
        graphicsQuality: 'low',
        healthMarkStyle: 'ribbon',
        extra: 1,
      }),
    ).toEqual({
      facingMarker: 'compass',
      graphicsQuality: 'low',
      healthMarkStyle: 'ribbon',
    });
  });
});
