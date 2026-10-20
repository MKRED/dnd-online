// Настройки пользователя: хранятся в аккаунте (users.settings, jsonb), так выбор один
// на всех устройствах. В базе может лежать неполный или устаревший объект — читать
// только через readUserSettings, который подставляет значения по умолчанию.

// Как на карте показан взгляд старта и существа: «нос» подставки с шевроном, два
// шеврона у края или кольцо-компас с засечками.
export const FACING_MARKERS = ['pointer', 'chevrons', 'compass'] as const;
export type FacingMarker = (typeof FACING_MARKERS)[number];

export interface UserSettings {
  facingMarker: FacingMarker;
}

export const DEFAULT_USER_SETTINGS: UserSettings = { facingMarker: 'pointer' };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Неизвестные поля отбрасываются, недопустимые значения заменяются значением по умолчанию.
export function readUserSettings(raw: unknown): UserSettings {
  const source = isRecord(raw) ? raw : {};
  const marker = source.facingMarker;
  return {
    facingMarker: FACING_MARKERS.includes(marker as FacingMarker)
      ? (marker as FacingMarker)
      : DEFAULT_USER_SETTINGS.facingMarker,
  };
}
