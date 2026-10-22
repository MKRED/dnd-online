import type { CharacterModelFit } from 'shared';

type Vec3 = [number, number, number];

// Рамка модели в её собственных координатах.
export interface ModelBox {
  min: Vec3;
  max: Vec3;
}

// Как поставить модель на клетку (docs/plan/character-models.md, «Решения»). Порядок
// преобразований — снаружи внутрь: поворот лицом (yaw), сдвиг и масштаб, поворот оси
// «верх». Так сдвиг считается уже по повёрнутой «вверх» модели, а поворот лицом крутит
// её вокруг центра места.
export interface ModelPlacement {
  // Поворот модели, у которой «верх» — Z: четверть оборота вокруг X.
  upRotationX: number;
  scale: number;
  position: Vec3;
  yaw: number;
}

// Доля места, которую занимает основание модели, — как ширина карточки (0.9 места).
const FOOTPRINT_SHARE = 0.9;

// Рамка после поворота «Z — верх» в «Y — верх» (на −90° вокруг X: y' = z, z' = −y).
function upright(box: ModelBox, up: CharacterModelFit['up']): ModelBox {
  if (up === 'y') return box;
  const [minX, minY, minZ] = box.min;
  const [maxX, maxY, maxZ] = box.max;
  return { min: [minX, minZ, -maxY], max: [maxX, maxZ, -minY] };
}

// Модель вписывается в место существа: большая сторона основания — во всю ширину места
// (footprint — сторона места в клетках), высота — по пропорциям; нижняя грань — на полу,
// середина основания — в центре места. Поправка пользователя: множитель и поворот.
export function placeModel(
  box: ModelBox,
  footprint: number,
  fit: CharacterModelFit,
): ModelPlacement {
  const { min, max } = upright(box, fit.up);
  const base = Math.max(max[0] - min[0], max[2] - min[2]);
  // Плоская или вырожденная модель (основание нулевое) — по высоте, иначе масштаб
  // ушёл бы в бесконечность.
  const extent = base > 0 ? base : max[1] - min[1] || 1;
  const scale = ((footprint * FOOTPRINT_SHARE) / extent) * fit.scale;
  return {
    upRotationX: fit.up === 'z' ? -Math.PI / 2 : 0,
    scale,
    position: [
      (-(min[0] + max[0]) / 2) * scale,
      -min[1] * scale,
      (-(min[2] + max[2]) / 2) * scale,
    ],
    yaw: (fit.turn * Math.PI) / 2,
  };
}

// Высота вписанной модели в клетках — над ней встают метка здоровья и подпись.
export function placedHeight(
  box: ModelBox,
  footprint: number,
  fit: CharacterModelFit,
): number {
  const { min, max } = upright(box, fit.up);
  return (max[1] - min[1]) * placeModel(box, footprint, fit).scale;
}
