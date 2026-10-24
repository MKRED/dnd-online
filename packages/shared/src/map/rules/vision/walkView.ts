import type { Vec3 } from '../../coords.js';
import { creatureSeen, type FogMasks } from './fogView.js';

// Путь существа глазами игрока (docs/plan/done/walk-animation.md): клетки, где его видит
// группа, а вместо каждого куска вне поля зрения — один null. Сколько клеток в скрытом
// куске, игрок не узнаёт. null — группа не видела ни одной клетки: игроку путь не нужен.
// fog === null — тумана нет, видно всё.
export function walkSeen(
  path: readonly Vec3[],
  fog: FogMasks | null,
): (Vec3 | null)[] | null {
  const seen: (Vec3 | null)[] = [];
  let any = false;
  for (const cell of path) {
    if (creatureSeen(cell, fog)) {
      seen.push(cell);
      any = true;
    } else if (seen.length === 0 || seen[seen.length - 1] !== null) {
      seen.push(null);
    }
  }
  return any ? seen : null;
}
