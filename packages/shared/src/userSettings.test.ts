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
  });

  it('берёт допустимые значения и отбрасывает лишние поля', () => {
    expect(readUserSettings({ facingMarker: 'compass', extra: 1 })).toEqual({
      facingMarker: 'compass',
    });
  });
});
