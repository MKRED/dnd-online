import {
  assertSliceArea,
  columnRuler,
  createSymbolTable,
} from './asciiSymbols.js';
import { readCell } from './chunkStore.js';
import type { MapState } from './mapState.js';

// Горизонтальный прямоугольник среза, границы включительно.
export interface SliceRegion {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Текстовый срез уровня y — так нейросеть «видит» карту сверху.
export function renderAsciiSlice(
  { store, palette }: MapState,
  y: number,
  region: SliceRegion,
): string {
  const { minX, maxX, minZ, maxZ } = region;
  assertSliceArea(maxX - minX + 1, maxZ - minZ + 1);
  const { symbolFor, legend } = createSymbolTable(palette);

  const zWidth = Math.max(String(minZ).length, String(maxZ).length);
  const rows: string[] = [];
  for (let z = minZ; z <= maxZ; z++) {
    let row = '';
    for (let x = minX; x <= maxX; x++)
      row += symbolFor(readCell(store, [x, y, z]));
    rows.push(`${String(z).padStart(zWidth)} ${row}`);
  }

  return [
    `Срез y=${y}, x=${minX}..${maxX} (столбцы, слева направо), z=${minZ}..${maxZ} (строки, сверху вниз). Север — сверху.`,
    ...legend,
    '',
    `${' '.repeat(zWidth)} ${columnRuler(minX, maxX)}`,
    ...rows,
  ].join('\n');
}
