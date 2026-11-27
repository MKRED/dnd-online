import type { CameraPlacement, Point } from '../cameraView';

// Камера переживает обновление страницы: у каждого человека в своём браузере, по
// месту — сцене игры (замечания после первой партии, 2026-10-26) или карте в
// редакторе (2026-11-27). Хранится несколько последних мест — старые вытесняются,
// чтобы запись не росла с каждой игрой и картой.
const KEEP = 20;

type Saved = Record<string, CameraPlacement>;

export interface CameraMemory {
  read: (placeId: string) => CameraPlacement | null;
  save: (placeId: string, placement: CameraPlacement) => void;
}

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
function readAll(key: string): Saved {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([, value]) => isPlacement(value)),
    );
  } catch (err: unknown) {
    console.error(`Failed to read the saved camera (${key})`, err);
    return {};
  }
}

export function cameraMemory(key: string): CameraMemory {
  return {
    read: (placeId) => readAll(key)[placeId] ?? null,
    // Место, где камеру двигали последней, — в конце: вытесняются те, что в начале.
    save: (placeId, placement) => {
      const rest = Object.entries(readAll(key)).filter(
        ([id]) => id !== placeId,
      );
      const kept = [...rest.slice(-(KEEP - 1)), [placeId, placement] as const];
      try {
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(kept)));
      } catch (err: unknown) {
        console.error(`Failed to remember the camera (${key})`, err);
      }
    },
  };
}

// Ключи прежние: у сцены игры запомненные камеры не теряются.
export const sceneCameraMemory = cameraMemory('scene.camera');
export const mapCameraMemory = cameraMemory('map.camera');
