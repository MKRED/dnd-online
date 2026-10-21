// Настройки пользователя: хранятся в аккаунте (users.settings, jsonb), так выбор один
// на всех устройствах. В базе может лежать неполный или устаревший объект — читать
// только через readUserSettings, который подставляет значения по умолчанию.

// Как на карте показан взгляд старта и существа: «нос» подставки с шевроном, два
// шеврона у края или кольцо-компас с засечками.
export const FACING_MARKERS = ['pointer', 'chevrons', 'compass'] as const;
export type FacingMarker = (typeof FACING_MARKERS)[number];

// Качество графики на карте: «низкое» — без анимаций (для слабых устройств),
// «среднее» — с анимациями (призрак над гробом поверженного), «высокое» — потом
// (частицы и т. п.), пока его выбрать нельзя.
export const GRAPHICS_QUALITIES = ['low', 'medium', 'high'] as const;
export type GraphicsQuality = (typeof GRAPHICS_QUALITIES)[number];
export const AVAILABLE_GRAPHICS_QUALITIES: readonly GraphicsQuality[] = [
  'low',
  'medium',
];

export interface UserSettings {
  facingMarker: FacingMarker;
  graphicsQuality: GraphicsQuality;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  facingMarker: 'pointer',
  graphicsQuality: 'medium',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Неизвестные поля отбрасываются, недопустимые значения заменяются значением по умолчанию.
export function readUserSettings(raw: unknown): UserSettings {
  const source = isRecord(raw) ? raw : {};
  const marker = source.facingMarker;
  const quality = source.graphicsQuality;
  return {
    facingMarker: FACING_MARKERS.includes(marker as FacingMarker)
      ? (marker as FacingMarker)
      : DEFAULT_USER_SETTINGS.facingMarker,
    // Недоступное качество («высокое») не сохраняется, но и битым не считается:
    // читается как значение по умолчанию.
    graphicsQuality: AVAILABLE_GRAPHICS_QUALITIES.includes(
      quality as GraphicsQuality,
    )
      ? (quality as GraphicsQuality)
      : DEFAULT_USER_SETTINGS.graphicsQuality,
  };
}
