import type { Vec3 } from 'shared';

// Камера смотрит на модель спереди-сбоку и сверху: «вперёд» у модели — север (−z), и
// она сначала смотрит на зрителя, как в предпросмотре модели персонажа.
// Редактору нужен запас вокруг модели (место для кисти и стрелки), квадратному
// предпросмотру и миниатюре — модель крупно (tight).
export function cameraFor([dx, dy, dz]: Vec3, tight = false) {
  const largest = Math.max(dx, dy, dz);
  const reach = tight ? largest * 1.35 + 8 : largest * 1.9 + 14;
  return {
    position: [reach * 0.6, reach * 0.7, -reach * 0.9] as Vec3,
    target: [0, dy / 3, 0] as Vec3,
  };
}
