import type { Box3, Vec3 } from 'shared';
import { toolCell, type EditorTool, type PickedCells } from './editorTools';

// Клетка — 5 футов (docs/plan/map.md, «Масштаб»).
const FEET_PER_CELL = 5;

// Какую клетку показать в строке координат внизу сцены. У инструмента — ту, с которой
// он работает (куда встанет блок, что сотрёт). В «Просмотре» — блок под курсором, а над
// землёй — клетку земли. У «Хода» — клетку, где встанет фигурка: над блоком, не в нём.
export function readoutCell(tool: EditorTool, pick: PickedCells): Vec3 | null {
  if (tool === 'view') return pick.hit ?? pick.place;
  if (tool === 'walk') return pick.place;
  return toolCell(tool, pick);
}

// «x 12 · y 3 · z 7»
export function cellLabel([x, y, z]: Vec3): string {
  return `x ${x} · y ${y} · z ${z}`;
}

// «6 × 4 × 3 клеток — 30 × 20 × 15 фт»: ширина (x) × глубина (z) × высота (y),
// в том же порядке, что размер карты.
export function regionSizeLabel({ min, max }: Box3): string {
  const cells = [0, 2, 1].map((axis) => max[axis] - min[axis] + 1);
  const feet = cells.map((n) => n * FEET_PER_CELL);
  return `${cells.join(' × ')} клеток — ${feet.join(' × ')} фт`;
}
