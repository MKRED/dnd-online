import { AIR, cellRotation, cellTypeId } from './cell.js';
import { MapOpError } from './ops.js';
import { blockNameOf, type Palette } from './palette.js';

// Карта растущая: два блока далеко друг от друга дают огромные границы, и срез «по
// границам карты» повесил бы сервер. Больше этого нейросеть всё равно не прочитает.
export const MAX_SLICE_CELLS = 100_000;

const AIR_SYMBOL = '.';
const SYMBOLS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%&*+=?';

// Символ выдаётся на каждое сочетание блок+поворот, встреченное в срезе, и
// расшифровывается в легенде: так видно, куда смотрят ступени и стены.
export function createSymbolTable(palette: Palette) {
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
  return { symbolFor, legend };
}

export function assertSliceArea(width: number, height: number) {
  if (width < 1 || height < 1 || width * height > MAX_SLICE_CELLS) {
    throw new MapOpError(
      `Срез ${width}×${height} — нужна область от 1 до ${MAX_SLICE_CELLS} клеток`,
    );
  }
}

// Последняя цифра координаты над каждым столбцом — чтобы считать координаты по срезу.
export function columnRuler(min: number, max: number): string {
  let ruler = '';
  for (let v = min; v <= max; v++) ruler += String(Math.abs(v) % 10);
  return ruler;
}
