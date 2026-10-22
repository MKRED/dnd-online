import { blockInfo } from './blockInfo.js';
import { AIR, cellRotation } from './cell.js';
import { parseCustomBlockName } from './customBlocks.js';
import type { MapState } from './mapState.js';
import { MapOpError } from './ops.js';

// Срез 256 × 256 «по границам карты» — уже 65 тыс. клеток, а прямоугольник из запроса
// может быть любым. Больше этого нейросеть всё равно не прочитает.
export const MAX_SLICE_CELLS = 100_000;

const AIR_SYMBOL = '.';
const SYMBOLS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#@$%&*+=?';

// Символ выдаётся на каждое сочетание блок+поворот, встреченное в срезе, и
// расшифровывается в легенде: так видно, куда смотрят ступени и стены. Свой блок
// подписан и именем для операций, и названием; блок удалённой группы — воздух.
export function createSymbolTable(map: MapState) {
  const symbolByValue = new Map<number, string>([[AIR, AIR_SYMBOL]]);
  const legend: string[] = [`${AIR_SYMBOL} = воздух`];
  const symbolFor = (value: number) => {
    let symbol = symbolByValue.get(value);
    if (symbol === undefined) {
      const block = blockInfo(map, value);
      if (!block) {
        symbolByValue.set(value, AIR_SYMBOL);
        return AIR_SYMBOL;
      }
      // Символы кончились (больше 70 разных блоков в срезе) — дальше общий «~».
      symbol = SYMBOLS[legend.length - 1] ?? '~';
      symbolByValue.set(value, symbol);
      // Имя своего блока — uuid, по нему не понять, что это; базовые имена говорящие.
      const title = parseCustomBlockName(block.name) ? ` «${block.label}»` : '';
      legend.push(
        `${symbol} = ${block.name}${title} (${cellRotation(value)}°)`,
      );
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
