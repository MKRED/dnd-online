import { AIR, cellRotation, cellTypeId } from './cell.js';
import { readCell } from './chunkStore.js';
import type { MapState } from './mapState.js';
import { MapOpError } from './ops.js';
import { blockNameOf } from './palette.js';

// Горизонтальный прямоугольник среза, границы включительно.
export interface SliceRegion {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

// Карта растущая: два блока далеко друг от друга дают огромные границы, и срез «по
// границам карты» повесил бы сервер. Больше этого нейросеть всё равно не прочитает.
export const MAX_SLICE_CELLS = 100_000;

const AIR_SYMBOL = '.';
const SYMBOLS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%&*+=?';

// Текстовый срез уровня y — так нейросеть «видит» карту. Символ выдаётся на каждое
// сочетание блок+поворот, встреченное в срезе, и расшифровывается в легенде:
// так в срезе видно, куда смотрят ступени и стены.
export function renderAsciiSlice(
  { store, palette }: MapState,
  y: number,
  region: SliceRegion,
): string {
  const symbolByValue = new Map<number, string>([[AIR, AIR_SYMBOL]]);
  const legend: string[] = [`${AIR_SYMBOL} = воздух`];
  const symbolFor = (value: number) => {
    let symbol = symbolByValue.get(value);
    if (symbol === undefined) {
      // Символы кончились (больше 70 разных блоков в срезе) — дальше общий «~».
      symbol = SYMBOLS[symbolByValue.size - 1] ?? '~';
      symbolByValue.set(value, symbol);
      const name = blockNameOf(palette, cellTypeId(value));
      legend.push(`${symbol} = ${name} (${cellRotation(value)}°)`);
    }
    return symbol;
  };

  const { minX, maxX, minZ, maxZ } = region;
  const width = maxX - minX + 1;
  const depth = maxZ - minZ + 1;
  if (width < 1 || depth < 1 || width * depth > MAX_SLICE_CELLS) {
    throw new MapOpError(
      `Срез ${width}×${depth} — нужна область от 1 до ${MAX_SLICE_CELLS} клеток`,
    );
  }
  const zWidth = Math.max(String(minZ).length, String(maxZ).length);
  const rows: string[] = [];
  for (let z = minZ; z <= maxZ; z++) {
    let row = '';
    for (let x = minX; x <= maxX; x++)
      row += symbolFor(readCell(store, [x, y, z]));
    rows.push(`${String(z).padStart(zWidth)} ${row}`);
  }
  // Последняя цифра x над каждым столбцом — чтобы считать координаты по срезу.
  let xRuler = '';
  for (let x = minX; x <= maxX; x++) xRuler += String(Math.abs(x) % 10);

  return [
    `Срез y=${y}, x=${minX}..${maxX} (столбцы, слева направо), z=${minZ}..${maxZ} (строки, сверху вниз). Север — сверху.`,
    ...legend,
    '',
    `${' '.repeat(zWidth)} ${xRuler}`,
    ...rows,
  ].join('\n');
}
