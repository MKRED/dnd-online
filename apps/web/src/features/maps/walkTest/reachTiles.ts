import {
  feetHeight,
  type CreatureSize,
  type MapState,
  type Point3,
  type Reach,
} from 'shared';
import { anchorOffset } from './walkTarget';

// Плитка «сюда можно дойти»: угол клетки на уровне ног (x, высота, z) и цена.
export interface ReachTile {
  at: Point3;
  cost: number;
}

// Плитки для подсветки достижимых позиций. У крупных существ плитка — та клетка
// основания, которую держит курсор (тот же сдвиг, что и при постановке): клик
// по плитке ставит существо ровно в эту позицию, а плитки основания 2×2 и больше
// налезали бы друг на друга.
export function reachTiles(
  map: MapState,
  reach: readonly Reach[],
  size: CreatureSize,
): ReachTile[] {
  const offset = anchorOffset(size);
  return reach.map(({ at, cost }) => ({
    at: [at[0] + offset, feetHeight(map, at, size), at[2] + offset],
    cost,
  }));
}
