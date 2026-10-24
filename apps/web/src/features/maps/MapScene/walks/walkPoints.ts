import type { CreatureSize, MapState, Point3, Vec3 } from 'shared';
import { standBase } from '../figures/figureLayout';

// Клетки пути — точками, где на них стоит существо: на ступени выше, на плите на
// полблока, с уступа ниже. null — кусок пути вне поля зрения.
export function walkPoints(
  map: MapState,
  path: readonly (Vec3 | null)[],
  size: CreatureSize,
): (Point3 | null)[] {
  return path.map((cell) => cell && standBase(map, cell, size).base);
}
