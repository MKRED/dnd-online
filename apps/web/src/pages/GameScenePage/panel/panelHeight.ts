// Высота панели под сценой на телефоне (вариант Б с пятью положениями, 2026-10-26): одна
// во всех режимах, инструментах и вкладках, чтобы сцена над ней не прыгала. Ручка над
// шапкой защёлкивает панель в одном из положений; номер виден, чтобы можно было сказать,
// в каком из них что-то не так. Доля страницы — после поворота телефона та же часть.
export const PANEL_SIZES = [0.2, 0.3, 0.4, 0.5, 0.6] as const;

// Номер с 0; сначала — среднее, 40 %.
export const DEFAULT_PANEL_SIZE = 2;

// Ниже — от панели остаются шапка и вкладки без содержимого (на очень низком экране).
export const MIN_PANEL_HEIGHT = 140;

const STORAGE_KEY = 'scene.panelSize';

// Положение, ближайшее к доле, которую дотянули пальцем.
export function nearestPanelSize(share: number): number {
  let best = 0;
  PANEL_SIZES.forEach((size, index) => {
    if (Math.abs(size - share) < Math.abs(PANEL_SIZES[best] - share)) {
      best = index;
    }
  });
  return best;
}

// Касание ручки — следующее положение, после последнего снова первое.
export function nextPanelSize(size: number): number {
  return (size + 1) % PANEL_SIZES.length;
}

export function isPanelSize(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value < PANEL_SIZES.length;
}

// Привычка этого устройства, одна на все игры; хранилище может быть недоступно
// (приватный режим) — тогда среднее.
export function readPanelSize(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const value = raw === null ? NaN : Number(raw);
    return isPanelSize(value) ? value : DEFAULT_PANEL_SIZE;
  } catch (err: unknown) {
    console.error('Failed to read the scene panel height', err);
    return DEFAULT_PANEL_SIZE;
  }
}

export function savePanelSize(size: number) {
  try {
    localStorage.setItem(STORAGE_KEY, String(size));
  } catch (err: unknown) {
    console.error('Failed to remember the scene panel height', err);
  }
}
