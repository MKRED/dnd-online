import {
  assertSliceArea,
  columnRuler,
  createSymbolTable,
} from './asciiSymbols.js';
import { readCell } from './chunkStore.js';
import type { Vec3 } from './coords.js';
import type { MapState } from './mapState.js';

// Вертикальный разрез — плоскость x = at или z = at. Горизонтальный срез не показывает
// высоты: крыши, этажи, лестницы и проёмы над ними проверяются только так.
export const SECTION_AXES = ['x', 'z'] as const;

export type SectionAxis = (typeof SECTION_AXES)[number];

// Прямоугольник разреза, границы включительно. min/max — вдоль второй горизонтальной
// оси (z для разреза по x, x для разреза по z).
export interface SectionRegion {
  min: number;
  max: number;
  minY: number;
  maxY: number;
}

// Смотрим так, чтобы столбцы шли по возрастанию координаты слева направо:
// разрез по z — с юга (слева запад), разрез по x — с запада (слева север).
const DESCRIPTION: Record<SectionAxis, (r: SectionRegion) => string> = {
  z: (r) =>
    `вид с юга: x=${r.min}..${r.max} (столбцы, слева направо — с запада на восток)`,
  x: (r) =>
    `вид с запада: z=${r.min}..${r.max} (столбцы, слева направо — с севера на юг)`,
};

export function renderAsciiSection(
  { store, palette }: MapState,
  axis: SectionAxis,
  at: number,
  region: SectionRegion,
): string {
  const { min, max, minY, maxY } = region;
  assertSliceArea(max - min + 1, maxY - minY + 1);
  const { symbolFor, legend } = createSymbolTable(palette);
  const cellAt = (h: number, y: number): Vec3 =>
    axis === 'x' ? [at, y, h] : [h, y, at];

  const yWidth = Math.max(String(minY).length, String(maxY).length);
  const rows: string[] = [];
  // Верх строкой выше — как на чертеже, земля внизу.
  for (let y = maxY; y >= minY; y--) {
    let row = '';
    for (let h = min; h <= max; h++)
      row += symbolFor(readCell(store, cellAt(h, y)));
    rows.push(`${String(y).padStart(yWidth)} ${row}`);
  }

  return [
    `Разрез ${axis}=${at}, ${DESCRIPTION[axis](region)}, y=${maxY}..${minY} (строки, сверху вниз).`,
    ...legend,
    '',
    `${' '.repeat(yWidth)} ${columnRuler(min, max)}`,
    ...rows,
  ].join('\n');
}
