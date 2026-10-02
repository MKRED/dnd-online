import type { Box3 } from 'shared';

// Камера карты из адреса страницы: /maps/:id?view=north&y=3 или ?cam=10,20,30&target=4,1,3.
// Одна ссылка — всегда одна и та же картинка: так нейросеть смотрит на результат
// через браузер, не двигая камеру мышью вслепую, а человек может поделиться видом.

export const CAMERA_VIEWS = ['top', 'north', 'south', 'west', 'east'] as const;
export type CameraView = (typeof CAMERA_VIEWS)[number];

export type Point = [number, number, number];

export interface CameraParams {
  // Сторона, с которой смотрит камера: north — камера на севере и смотрит на юг.
  view: CameraView;
  // Точная камера в координатах клеток; если задана, view игнорируется.
  cam: Point | null;
  target: Point | null;
}

export interface CameraPlacement {
  position: Point;
  target: Point;
}

function parsePoint(raw: string | null): Point | null {
  if (!raw) return null;
  const parts = raw.split(',').map(Number);
  if (parts.length !== 3 || !parts.every(Number.isFinite)) return null;
  return [parts[0], parts[1], parts[2]];
}

// Сырые значения из адреса страницы (searchParams.get(...)).
export interface CameraQuery {
  view: string | null;
  cam: string | null;
  target: string | null;
}

export function parseCameraParams({
  view,
  cam,
  target,
}: CameraQuery): CameraParams {
  return {
    view: CAMERA_VIEWS.includes(view as CameraView)
      ? (view as CameraView)
      : 'south',
    cam: parsePoint(cam),
    target: parsePoint(target),
  };
}

// Срез по высоте из ?y=; null — не задан или не число.
export function parseCutY(search: URLSearchParams): number | null {
  const raw = search.get('y');
  if (raw === null || raw.trim() === '') return null;
  const y = Number(raw);
  return Number.isInteger(y) ? y : null;
}

// Направление «откуда смотрим» в плоскости XZ. Север — -z.
const VIEW_DIRECTIONS: Record<Exclude<CameraView, 'top'>, [number, number]> = {
  north: [0, -1],
  south: [0, 1],
  west: [-1, 0],
  east: [1, 0],
};

export function placeCamera(
  { min, max }: Box3,
  params: CameraParams,
): CameraPlacement {
  const height = max[1] - min[1] + 1;
  // Смотрим в середину по высоте, а размер кадра учитывает и высоту — иначе
  // башни и многоэтажные дома не влезают в кадр.
  const center: Point = [
    (min[0] + max[0] + 1) / 2,
    min[1] + height / 2,
    (min[2] + max[2] + 1) / 2,
  ];
  const target = params.target ?? center;
  if (params.cam) return { position: params.cam, target };

  const size = Math.max(max[0] - min[0], max[2] - min[2], height * 1.5, 8);
  if (params.view === 'top') {
    // Строго сверху камера вырождается (взгляд вдоль «up»): крошечный сдвиг на юг
    // держит север вверху экрана.
    return {
      position: [target[0], target[1] + size * 1.4, target[2] + 0.01],
      target,
    };
  }
  const [dx, dz] = VIEW_DIRECTIONS[params.view];
  const distance = size * 1.1;
  return {
    position: [
      target[0] + dx * distance,
      target[1] + distance,
      target[2] + dz * distance,
    ],
    target,
  };
}
