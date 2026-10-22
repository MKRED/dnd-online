import { MATERIALS, type MaterialName } from 'shared';
import {
  brickTile,
  glassTile,
  iceTile,
  planksTile,
  stoneTile,
} from './buildingTextures';
import { acidTile, fireTile, lavaTile, swampTile } from './hazardTextures';
import {
  dirtTile,
  grassSideTile,
  grassTopTile,
  sandTile,
  waterTile,
} from './natureTextures';
import { hexToRgb, matchMean, type Rgb, type Tile } from './pixels';

export const FACE_KINDS = ['top', 'side', 'bottom'] as const;
export type FaceKind = (typeof FACE_KINDS)[number];

export type MaterialTextures = Record<FaceKind, Tile>;

const ONE_TILE: Record<Exclude<MaterialName, 'grass'>, (base: Rgb) => Tile> = {
  stone: stoneTile,
  brick: brickTile,
  wood: planksTile,
  dirt: dirtTile,
  sand: sandTile,
  glass: glassTile,
  ice: iceTile,
  lava: lavaTile,
  acid: acidTile,
  swamp: swampTile,
  fire: fireTile,
  water: waterTile,
};

// Текстуры базовых блоков рисует код, а не файлы (docs/plan/blocks.md, этап 1): атлас
// собирается сразу, без загрузки картинок. Грани отличаются только у травы — сверху
// дёрн, сбоку земля с бахромой, снизу земля; у остальных одна плитка на все грани.
// Средний цвет каждой плитки — основной цвет материала (matchMean), кроме стекла:
// оно почти прозрачное, и его цвет задаёт рамка, а не среднее.
export function materialTextures(material: MaterialName): MaterialTextures {
  const base = hexToRgb(MATERIALS[material].color);
  if (material === 'grass') {
    const dirt = hexToRgb(MATERIALS.dirt.color);
    return {
      top: matchMean(grassTopTile(base), base),
      side: grassSideTile(base, dirt),
      bottom: matchMean(dirtTile(dirt), dirt),
    };
  }
  const raw = ONE_TILE[material](base);
  const tile = material === 'glass' ? raw : matchMean(raw, base);
  return { top: tile, side: tile, bottom: tile };
}
