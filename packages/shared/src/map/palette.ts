import { BASE_BLOCKS, type BlockCatalog } from './blockInfo.js';
import { getBlock } from './blocks.js';
import { AIR, MAX_BLOCK_TYPE_ID } from './cell.js';
import { parseCustomBlockName } from './customBlocks.js';
import { MapOpError } from './mapOpError.js';

export const AIR_NAME = 'air';

// Палитра карты: индекс — id типа в клетке, значение — имя блока из каталога.
// Только растёт: id уже записаны в чанки и журнал, перенумерация их сломала бы.
export type Palette = string[];

export function createPalette(): Palette {
  return [AIR_NAME];
}

// Похоже ли на имя блока: воздух, базовый блок или свой блок справочника. Есть ли такой
// свой блок у владельца карты, решает каталог при записи (resolveBlockId).
export function isKnownBlockName(name: string): boolean {
  return (
    name === AIR_NAME ||
    getBlock(name) !== undefined ||
    parseCustomBlockName(name) !== null
  );
}

// Возвращает id блока, при необходимости дописывая его в конец палитры. Каталог
// проверяется и для имени, которое уже в палитре: блок удалённой группы там остался,
// но поставить его снова нельзя.
export function resolveBlockId(
  palette: Palette,
  name: string,
  catalog: BlockCatalog = BASE_BLOCKS,
): { id: number; added: boolean } {
  if (name === AIR_NAME) return { id: AIR, added: false };
  // Ошибка запроса, а не программы: своё имя проходит разбор операции по виду, а есть
  // ли такой блок у владельца карты, известно только здесь.
  if (!catalog.describe(name))
    throw new MapOpError(`Неизвестный блок: ${name}`);
  const existing = palette.indexOf(name);
  if (existing !== -1) return { id: existing, added: false };
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
