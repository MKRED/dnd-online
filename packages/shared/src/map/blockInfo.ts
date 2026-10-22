import { AIR, cellTypeId } from './cell.js';
import { getBlock } from './blocks.js';
import type { MapState } from './mapState.js';
import {
  MATERIALS,
  type BlockMaterial,
  type MaterialName,
} from './materials.js';
import type { Palette } from './palette.js';
import type { ShapeName } from './shapes.js';

// Описание блока для правил и отрисовки (docs/plan/blocks.md, этап 2). Правила читают
// свойства только отсюда, а не из MATERIALS: так справочник на этапе 3 подставит свои
// блоки, не переписывая правила. Описание плоское, на каждый блок.
export interface BlockInfo {
  name: string;
  label: string;
  shape: ShapeName;
  // Вид: базовый материал, чьи текстуры рисуются. По нему же опора под существом
  // считается одним материалом (лава-куб и лава-плита — одна опасность).
  material: MaterialName;
  // Свойства для правил и основной цвет.
  traits: BlockMaterial;
}

export interface BlockCatalog {
  describe(name: string): BlockInfo | undefined;
}

function baseInfo(name: string): BlockInfo | undefined {
  const block = getBlock(name);
  if (!block) return undefined;
  return { ...block, traits: MATERIALS[block.material] };
}

const BASE_INFO = new Map<string, BlockInfo | undefined>();

// Встроенные блоки: материалы × формы, как BLOCK_CATALOG.
export const BASE_BLOCKS: BlockCatalog = {
  describe(name) {
    if (!BASE_INFO.has(name)) BASE_INFO.set(name, baseInfo(name));
    return BASE_INFO.get(name);
  },
};

// Описания по id палитры — на пару «каталог, палитра»: туман пускает тысячи лучей,
// путь проверяет тысячи шагов, и поиск по имени на каждой клетке стал бы главной ценой.
// Палитра только растёт, но кэш всё равно сверяет имя: id → имя у неё не меняется,
// а сверка дешёвая и спасает, если массив палитры когда-нибудь подменят на месте.
const caches = new WeakMap<
  BlockCatalog,
  WeakMap<Palette, Map<number, { name: string; info: BlockInfo | null }>>
>();

function paletteCache(catalog: BlockCatalog, palette: Palette) {
  let byPalette = caches.get(catalog);
  if (!byPalette) {
    byPalette = new WeakMap();
    caches.set(catalog, byPalette);
  }
  let cache = byPalette.get(palette);
  if (!cache) {
    cache = new Map();
    byPalette.set(palette, cache);
  }
  return cache;
}

// Описание блока в клетке по её значению; null — воздух или блок, которого каталог не знает.
export function blockInfo(map: MapState, value: number): BlockInfo | null {
  if (value === AIR) return null;
  const typeId = cellTypeId(value);
  const name = map.palette[typeId] ?? '';
  const catalog = map.blocks ?? BASE_BLOCKS;
  const cache = paletteCache(catalog, map.palette);
  const cached = cache.get(typeId);
  if (cached?.name === name) return cached.info;
  const info = catalog.describe(name) ?? null;
  cache.set(typeId, { name, info });
  return info;
}
