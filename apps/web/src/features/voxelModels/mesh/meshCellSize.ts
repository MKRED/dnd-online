import {
  MODEL_SIZE_MAX,
  orientMeshPoint,
  type ModelMeshFit,
  type Vec3,
} from 'shared';

// Небольшой допуск: стенка ровно в 2 клетки не должна стать тремя из-за округления.
const EPS = 1e-6;

const cells = (extent: number, perUnit: number) =>
  Math.min(MODEL_SIZE_MAX, Math.max(1, Math.ceil(extent * perUnit - EPS)));

// Размер в клетках для файла, загруженного из формы монстра (docs/plan/done/monster-models.md,
// этап 4): длинная сторона основания — во всё место существа (width клеток), высота и
// вторая сторона — по пропорциям файла, но не больше MODEL_SIZE_MAX. На карте монстр
// вписывается по своему размеру, клетки модели нужны только записи справочника.
export function meshCellSize(
  positions: Float32Array,
  fit: ModelMeshFit,
  width: number,
): Vec3 {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    const p = orientMeshPoint(
      positions[i],
      positions[i + 1],
      positions[i + 2],
      fit,
    );
    for (let a = 0; a < 3; a++) {
      min[a] = Math.min(min[a], p[a]);
      max[a] = Math.max(max[a], p[a]);
    }
  }
  const [ex, ey, ez] = [0, 1, 2].map((a) =>
    Number.isFinite(max[a] - min[a]) ? max[a] - min[a] : 0,
  );
  const base = Math.max(ex, ez);
  const side = Math.min(MODEL_SIZE_MAX, Math.max(1, Math.ceil(width)));
  if (base <= 0 && ey <= 0) return [side, side, side];
  // Клеток на единицу файла: основание во всё место, но высота не выше предела.
  const perUnit = Math.min(
    base > 0 ? side / base : Infinity,
    ey > 0 ? MODEL_SIZE_MAX / ey : Infinity,
  );
  return [cells(ex, perUnit), cells(ey, perUnit), cells(ez, perUnit)];
}
