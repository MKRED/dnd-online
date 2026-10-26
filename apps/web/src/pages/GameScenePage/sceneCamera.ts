import type { CameraPlacement, Point } from '../../features/maps/cameraView';

// Камера сцены игры переживает обновление страницы (замечания после первой партии,
// 2026-10-26): у каждого человека в своём браузере, по сцене. Хранится несколько
// последних сцен — старые вытесняются, чтобы запись не росла с каждой игрой.
const STORAGE_KEY = 'scene.camera';
const KEEP = 20;

type Saved = Record<string, CameraPlacement>;

const isPoint = (value: unknown): value is Point =>
  Array.isArray(value) &&
  value.length === 3 &&
  value.every((n) => typeof n === 'number' && Number.isFinite(n));

const isPlacement = (value: unknown): value is CameraPlacement =>
  typeof value === 'object' &&
  value !== null &&
  isPoint((value as CameraPlacement).position) &&
  isPoint((value as CameraPlacement).target);

// Хранилище может быть недоступно (приватный режим) или испорчено — тогда камеры нет.
function readAll(): Saved {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isPlacement(value)),
    );
  } catch (err: unknown) {
    console.error('Failed to read the saved scene camera', err);
    return {};
  }
}

export function readSceneCamera(sceneId: string): CameraPlacement | null {
  return readAll()[sceneId] ?? null;
}

// Сцена, где камеру двигали последней, — в конце: вытесняются те, что в начале.
export function saveSceneCamera(sceneId: string, placement: CameraPlacement) {
  const rest = Object.entries(readAll()).filter(([id]) => id !== sceneId);
  const kept = [...rest.slice(-(KEEP - 1)), [sceneId, placement] as const];
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch (err: unknown) {
    console.error('Failed to remember the scene camera', err);
  }
}
