import { hash } from './noise';
import { TILE_SIZE } from './pixels';

export interface VoronoiCell {
  // Номер камня: от него зависят оттенок и прочие случайности камня.
  id: number;
  // Расстояние до своего центра и разница со вторым по близости: малая — шов.
  distance: number;
  edge: number;
}

const wrap = (value: number, period: number) =>
  ((value % period) + period) % period;

// Камни мостовой и обломков: в каждой ячейке сетки cell × cell — свой сдвинутый центр,
// пиксель принадлежит ближайшему. Сетка замкнута по краю плитки, как у valueNoise,
// поэтому камни на стыке блоков не обрываются. cell должен делить размер плитки.
export function voronoi(
  x: number,
  y: number,
  cell: number,
  seed: number,
): VoronoiCell {
  const period = TILE_SIZE / cell;
  const gx = Math.floor(x / cell);
  const gy = Math.floor(y / cell);
  let first = { id: 0, distance: Infinity };
  let second = Infinity;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const cx = wrap(gx + dx, period);
      const cy = wrap(gy + dy, period);
      const px = (gx + dx + 0.15 + hash(cx, cy, seed) * 0.7) * cell;
      const py = (gy + dy + 0.15 + hash(cx, cy, seed + 1) * 0.7) * cell;
      const distance = Math.hypot(x + 0.5 - px, y + 0.5 - py);
      if (distance < first.distance) {
        second = first.distance;
        first = { id: cy * period + cx, distance };
      } else if (distance < second) second = distance;
    }
  }
  return { ...first, edge: second - first.distance };
}
