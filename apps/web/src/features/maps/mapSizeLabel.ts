import { sizeLabel, type MapSize } from 'shared';

// Клетка — 5 футов (docs/plan/map.md, «Масштаб»).
const FEET_PER_CELL = 5;

// «32 × 32 клеток (160 × 160 фт)» — размер карты в подписях.
export function mapSizeLabel(size: MapSize): string {
  const feet = sizeLabel({
    width: size.width * FEET_PER_CELL,
    depth: size.depth * FEET_PER_CELL,
  });
  return `${sizeLabel(size)} клеток (${feet} фт)`;
}
