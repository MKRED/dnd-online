// Ширина правой панели на компьютере (вариант А, 2026-10-28): левый край тянут мышью,
// ширина плавная и одна во всех вкладках, режимах и записях — привычка устройства, как
// высота панели сцены на телефоне (GameScenePage/panel/panelHeight.ts). У сцены игры и
// редактора карт ширина своя. В пикселях: 1rem = 16px.

// Уже не влезает блок «Ваш ход» (три значка действий и счётчики в строку).
export const MIN_PANEL_WIDTH = 288; // 18rem
// Шире половины страницы — сцене почти не остаётся места.
export const MAX_PANEL_SHARE = 0.5;
// Утянули край вправо дальше минимума на столько — отпустили, панель свернулась.
export const COLLAPSE_OVERSHOOT = 64;
// Шаг стрелок на крае.
export const PANEL_WIDTH_STEP = 16;

// Ширина в пределах: не уже минимума и не шире половины страницы. На узком окне
// половина может быть меньше минимума — тогда минимум.
export function clampPanelWidth(width: number, pageWidth: number): number {
  const max = Math.max(
    MIN_PANEL_WIDTH,
    Math.floor(pageWidth * MAX_PANEL_SHARE),
  );
  return Math.round(Math.min(max, Math.max(MIN_PANEL_WIDTH, width)));
}

// Дотянули до сворачивания: край ушёл вправо дальше минимума с запасом.
export function collapsesAt(width: number): boolean {
  return width < MIN_PANEL_WIDTH - COLLAPSE_OVERSHOOT;
}

// Запомненная ширина; без записи, с мусором или без хранилища (приватный режим) —
// обычная. Верх не проверяем: половину страницы держит CSS (max-width), окно может
// стать шире.
export function readPanelWidth(key: string, fallback: number): number {
  try {
    const raw = localStorage.getItem(key);
    const value = raw === null ? NaN : Number(raw);
    return Number.isFinite(value) && value >= MIN_PANEL_WIDTH
      ? Math.round(value)
      : fallback;
  } catch (err: unknown) {
    console.error('Failed to read the panel width', key, err);
    return fallback;
  }
}

export function savePanelWidth(key: string, width: number) {
  try {
    localStorage.setItem(key, String(width));
  } catch (err: unknown) {
    console.error('Failed to remember the panel width', key, err);
  }
}
