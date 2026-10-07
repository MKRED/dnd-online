import {
  surfaceInCell,
  type CreatureSize,
  type MapState,
  type Point3,
  type Reach,
  type Vec3,
} from 'shared';
import { bodyCells } from './walkTarget';

// Плитка «сюда можно дойти»: угол клетки на высоте её опоры (x, высота, z) и цена.
export interface ReachTile {
  at: Point3;
  cost: number;
}

// Высота опоры в клетке на уровне ног: верх плиты или нижней ступени в ней самой,
// иначе верх полного блока под ней (как в правилах стояния). null — опоры нет.
// Плитку ставим на опору своей клетки, а не на ноги тела: ноги крупного существа
// стоят на самой высокой опоре основания, и рядом с плитой или ступенями плитка
// висела бы над полом на полблока.
function tileHeight(map: MapState, cell: Vec3): number | null {
  const surface = surfaceInCell(map, cell);
  if (surface > 0) return cell[1] + surface;
  const below = surfaceInCell(map, [cell[0], cell[1] - 1, cell[2]]);
  return below === 1 ? cell[1] : null;
}

// Плитки для подсветки достижимых позиций — по клеткам сетки, как у Среднего.
// Клетка подсвечена, если курсор из неё может выбрать достижимую позицию (см.
// walkAnchors): у нечётных размеров это средняя клетка основания, у чётных —
// средние 2×2, ведь центр тела уходит в угол клетки, ближайший к курсору. Одну
// клетку дают несколько позиций — берём самую дешёвую. Плитки во всё основание
// показали бы клетки, откуда эту позицию не выбрать. Клетку без опоры (тело
// свешивается над пустотой) не подсвечиваем: плитка висела бы в воздухе.
export function reachTiles(
  map: MapState,
  reach: readonly Reach[],
  size: CreatureSize,
): ReachTile[] {
  const n = bodyCells(size);
  const from = Math.floor((n - 1) / 2);
  const to = Math.floor(n / 2);
  const tiles = new Map<string, ReachTile>();
  for (const { at, cost } of reach) {
    for (let dx = from; dx <= to; dx++) {
      for (let dz = from; dz <= to; dz++) {
        // Ключ — клетка и уровень ног: на мосту и под ним — разные плитки.
        const cell: Vec3 = [at[0] + dx, at[1], at[2] + dz];
        const height = tileHeight(map, cell);
        if (height === null) continue;
        const key = cell.join(',');
        const known = tiles.get(key);
        if (known && known.cost <= cost) continue;
        tiles.set(key, { at: [cell[0], height, cell[2]], cost });
      }
    }
  }
  return [...tiles.values()];
}
