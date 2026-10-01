import { AIR, MAX_BLOCK_TYPE_ID } from './cell.js';
import { getBlock } from './blocks.js';

export const AIR_NAME = 'air';

// Палитра карты: индекс — id типа в клетке, значение — имя блока из каталога.
// Только растёт: id уже записаны в чанки и журнал, перенумерация их сломала бы.
export type Palette = string[];

export function createPalette(): Palette {
  return [AIR_NAME];
}

export function isKnownBlockName(name: string): boolean {
  return name === AIR_NAME || getBlock(name) !== undefined;
}

// Возвращает id блока, при необходимости дописывая его в конец палитры.
export function resolveBlockId(
  palette: Palette,
  name: string,
): { id: number; added: boolean } {
  if (name === AIR_NAME) return { id: AIR, added: false };
  const existing = palette.indexOf(name);
  if (existing !== -1) return { id: existing, added: false };
  if (!getBlock(name)) throw new RangeError(`Неизвестный блок: ${name}`);
  if (palette.length > MAX_BLOCK_TYPE_ID) {
    throw new RangeError('В палитре карты закончились id типов блоков');
  }
  palette.push(name);
  return { id: palette.length - 1, added: true };
}

export function blockNameOf(palette: Palette, typeId: number): string {
  const name = palette[typeId];
  if (name === undefined) {
    throw new RangeError(`В палитре нет типа блока с id ${typeId}`);
  }
  return name;
}
