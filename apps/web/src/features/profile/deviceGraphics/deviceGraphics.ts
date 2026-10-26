import {
  DEFAULT_USER_SETTINGS,
  GRAPHICS_PRESET_VALUES,
  readUserSettings,
  type GraphicsSettings,
  type UserSettings,
} from 'shared';

// Графика этого устройства (замечания после первой партии, 2026-10-26, вариант А): набор и
// значения хранятся в браузере, а не в аккаунте — на телефоне и компьютере они свои.
export type DeviceGraphics = Pick<UserSettings, 'graphicsPreset'> &
  GraphicsSettings;

const STORAGE_KEY = 'graphics.device';

export function pickGraphics(settings: UserSettings): DeviceGraphics {
  return {
    graphicsPreset: settings.graphicsPreset,
    animationFps: settings.animationFps,
    creatureModels: settings.creatureModels,
    renderScale: settings.renderScale,
    antialias: settings.antialias,
    frameLimit: settings.frameLimit,
  };
}

const isDefault = (graphics: DeviceGraphics) =>
  JSON.stringify(graphics) ===
  JSON.stringify(pickGraphics(DEFAULT_USER_SETTINGS));

// Устройство без своей графики начинает с той, что раньше сохранили в аккаунте. Если там
// ничего не выбирали (стоит умолчание), телефон начинает с «Низкого», компьютер — со
// «Среднего».
export function startingGraphics(
  account: UserSettings,
  phone: boolean,
): DeviceGraphics {
  const saved = pickGraphics(account);
  if (!phone || !isDefault(saved)) return saved;
  return { graphicsPreset: 'low', ...GRAPHICS_PRESET_VALUES.low };
}

// Телефон — узкий экран с пальцем вместо мыши.
export function isPhone(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse) and (max-width: 48em)').matches
  );
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to read the device graphics', err);
    return null;
  }
}

// Сохранённое проверяется так же, как настройки аккаунта: битое — значения по умолчанию.
export function parseDeviceGraphics(raw: string | null): DeviceGraphics | null {
  if (raw === null) return null;
  try {
    return pickGraphics(readUserSettings(JSON.parse(raw)));
  } catch (err) {
    console.error('Failed to parse the device graphics', err);
    return null;
  }
}

// Снимок для useSyncExternalStore: тот же объект, пока строка в хранилище не менялась.
let cache: { raw: string | null; value: DeviceGraphics | null } | null = null;
export function storedGraphics(): DeviceGraphics | null {
  const raw = readRaw();
  if (!cache || cache.raw !== raw) {
    cache = { raw, value: parseDeviceGraphics(raw) };
  }
  return cache.value;
}

const listeners = new Set<() => void>();

// Подписка: свои сохранения и сохранения из других вкладок (событие storage).
export function subscribeGraphics(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function saveDeviceGraphics(graphics: DeviceGraphics): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(graphics));
  } catch (err) {
    console.error('Failed to save the device graphics', err);
  }
  listeners.forEach((listener) => listener());
}
