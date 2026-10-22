// Настройки пользователя: хранятся в аккаунте (users.settings, jsonb), так выбор один
// на всех устройствах. В базе может лежать неполный или устаревший объект — читать
// только через readUserSettings, который подставляет значения по умолчанию.

// Как на карте показан взгляд старта и существа: «нос» подставки с шевроном, два
// шеврона у края или кольцо-компас с засечками.
export const FACING_MARKERS = ['pointer', 'chevrons', 'compass'] as const;
export type FacingMarker = (typeof FACING_MARKERS)[number];

// Вид метки здоровья над существом в игре: тёмная табличка с рамкой, надпись с обводкой
// или лента.
export const HEALTH_MARK_STYLES = ['plate', 'text', 'ribbon'] as const;
export type HealthMarkStyle = (typeof HEALTH_MARK_STYLES)[number];

// Графика карты и сцены (решено с пользователем 2026-10-23): набор «низкое», «среднее»,
// «высокое» (потом: частицы и т. п., пока его выбрать нельзя) задаёт все значения сразу;
// «своё» — значения выбраны по одному.
export const GRAPHICS_PRESETS = ['low', 'medium', 'high', 'custom'] as const;
export type GraphicsPreset = (typeof GRAPHICS_PRESETS)[number];
export const AVAILABLE_GRAPHICS_PRESETS: readonly GraphicsPreset[] = [
  'low',
  'medium',
  'custom',
];

// 3D-модели существ на карте: у всех, только у фигурок персонажей игроков (отряда)
// или ни у кого — тогда везде карточки.
export const CREATURE_MODEL_MODES = ['all', 'party', 'none'] as const;
export type CreatureModelMode = (typeof CREATURE_MODEL_MODES)[number];

// Доля от плотности пикселей экрана, в которой рисуется сцена: на 0,5 пикселей вчетверо
// меньше — главное облегчение для слабой видеокарты.
export const RENDER_SCALES = [1, 0.75, 0.5] as const;
export type RenderScale = (typeof RENDER_SCALES)[number];

// Предел кадров в секунду для всей сцены (и движения камеры); 0 — без предела.
export const FRAME_LIMITS = [0, 60, 30] as const;
export type FrameLimit = (typeof FRAME_LIMITS)[number];

// Частота анимаций (призрак над гробом и т. п.): 0 — без анимаций.
export const ANIMATION_FPS_MAX = 60;

export interface GraphicsSettings {
  animationFps: number;
  creatureModels: CreatureModelMode;
  renderScale: RenderScale;
  antialias: boolean;
  frameLimit: FrameLimit;
}

// Значения наборов. «Среднее» — как было до наборов: анимации 18 кадров в секунду
// (на глаз почти не отличить от 60, а процессор не занят), модели у всех.
export const GRAPHICS_PRESET_VALUES: Record<
  Exclude<GraphicsPreset, 'custom'>,
  GraphicsSettings
> = {
  low: {
    animationFps: 0,
    creatureModels: 'none',
    renderScale: 0.75,
    antialias: false,
    frameLimit: 30,
  },
  medium: {
    animationFps: 18,
    creatureModels: 'all',
    renderScale: 1,
    antialias: true,
    frameLimit: 0,
  },
  high: {
    animationFps: 60,
    creatureModels: 'all',
    renderScale: 1,
    antialias: true,
    frameLimit: 0,
  },
};

export interface UserSettings extends GraphicsSettings {
  facingMarker: FacingMarker;
  graphicsPreset: GraphicsPreset;
  healthMarkStyle: HealthMarkStyle;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  facingMarker: 'pointer',
  graphicsPreset: 'medium',
  ...GRAPHICS_PRESET_VALUES.medium,
  healthMarkStyle: 'plate',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

const oneOf = <T>(list: readonly T[], value: unknown, fallback: T): T =>
  list.includes(value as T) ? (value as T) : fallback;

// Набор: свой или прежнее «качество графики» (low, medium — до наборов). Недоступный
// («высокое») не сохраняется, но и битым не считается: читается как по умолчанию.
function readPreset(source: Record<string, unknown>): GraphicsPreset {
  const preset = source.graphicsPreset ?? source.graphicsQuality;
  return oneOf(
    AVAILABLE_GRAPHICS_PRESETS,
    preset,
    DEFAULT_USER_SETTINGS.graphicsPreset,
  );
}

function readAnimationFps(value: unknown): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= ANIMATION_FPS_MAX
    ? value
    : DEFAULT_USER_SETTINGS.animationFps;
}

// Значения графики: у набора — его, у «своего» — сохранённые, каждое проверено.
function readGraphics(
  source: Record<string, unknown>,
  preset: GraphicsPreset,
): GraphicsSettings {
  if (preset !== 'custom') return { ...GRAPHICS_PRESET_VALUES[preset] };
  const fallback = DEFAULT_USER_SETTINGS;
  return {
    animationFps: readAnimationFps(source.animationFps),
    creatureModels: oneOf(
      CREATURE_MODEL_MODES,
      source.creatureModels,
      fallback.creatureModels,
    ),
    renderScale: oneOf(RENDER_SCALES, source.renderScale, fallback.renderScale),
    antialias:
      typeof source.antialias === 'boolean'
        ? source.antialias
        : fallback.antialias,
    frameLimit: oneOf(FRAME_LIMITS, source.frameLimit, fallback.frameLimit),
  };
}

// Неизвестные поля отбрасываются, недопустимые значения заменяются значением по умолчанию.
export function readUserSettings(raw: unknown): UserSettings {
  const source = isRecord(raw) ? raw : {};
  const graphicsPreset = readPreset(source);
  return {
    facingMarker: oneOf(
      FACING_MARKERS,
      source.facingMarker,
      DEFAULT_USER_SETTINGS.facingMarker,
    ),
    graphicsPreset,
    ...readGraphics(source, graphicsPreset),
    healthMarkStyle: oneOf(
      HEALTH_MARK_STYLES,
      source.healthMarkStyle,
      DEFAULT_USER_SETTINGS.healthMarkStyle,
    ),
  };
}
