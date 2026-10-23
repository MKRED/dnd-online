import { MATERIALS, type MaterialName } from 'shared';
import { bonesTile } from './bonesTexture';
import {
  brickTile,
  darkPlanksTile,
  glassTile,
  iceTile,
  planksTile,
  stoneTile,
} from './buildingTextures';
import {
  leavesTile,
  pathSideTile,
  pathTile,
  scorchedTile,
  snowTile,
} from './groundTextures';
import { acidTile, fireTile, lavaTile, swampTile } from './hazardTextures';
import {
  dirtTile,
  grassSideTile,
  grassTopTile,
  sandTile,
  waterTile,
} from './natureTextures';
import { hexToRgb, matchMean, type Rgb, type Tile } from './pixels';
import { plainTile } from './plainTexture';
import {
  cobbleTile,
  darkstoneTile,
  mossyTile,
  rubbleTile,
} from './stoneworkTextures';

export const FACE_KINDS = ['top', 'side', 'bottom'] as const;
export type FaceKind = (typeof FACE_KINDS)[number];

export type MaterialTextures = Record<FaceKind, Tile>;

// Плитки со сквозными дырами (альфа 0 или 255, без полупрозрачности). Такие блоки
// рисуются вместе с непрозрачными, а дыры отбрасывает alphaTest: в общей куче
// прозрачных без записи глубины задние листья кроны ложились бы поверх передних.
export const CUTOUT_MATERIALS: ReadonlySet<MaterialName> = new Set(['leaves']);

// Материалы, у которых верх свой, а бок и низ — земля: трава и тропа.
type ToppedMaterial = 'grass' | 'path';

const ONE_TILE: Record<
  Exclude<MaterialName, ToppedMaterial>,
  (base: Rgb) => Tile
> = {
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
  cobble: cobbleTile,
  darkstone: darkstoneTile,
  mossy: mossyTile,
  darkwood: darkPlanksTile,
  scorched: scorchedTile,
  snow: snowTile,
  rubble: rubbleTile,
  bones: bonesTile,
  leaves: leavesTile,
  plain: plainTile,
};

// Текстуры базовых блоков рисует код, а не файлы (docs/plan/blocks.md, этап 1): атлас
// собирается сразу, без загрузки картинок. Грани отличаются только у травы и тропы —
// сверху свой слой, сбоку земля с его краем, снизу земля; у остальных одна плитка на
// все грани. Средний цвет каждой плитки — основной цвет материала (matchMean), кроме
// стекла: оно почти прозрачное, и его цвет задаёт рамка, а не среднее.
// color — основной цвет своей группы блоков на этой основе (docs/plan/blocks.md, этап 4):
// узор основы, перекрашенный в него.
export function materialTextures(
  material: MaterialName,
  color: string = MATERIALS[material].color,
): MaterialTextures {
  const base = hexToRgb(color);
  if (material === 'grass' || material === 'path') {
    const dirt = hexToRgb(MATERIALS.dirt.color);
    const soil = matchMean(dirtTile(dirt), dirt);
    const top = material === 'grass' ? grassTopTile(base) : pathTile(base);
    return {
      top: matchMean(top, base),
      side:
        material === 'grass'
          ? grassSideTile(base, dirt)
          : pathSideTile(base, soil),
      bottom: soil,
    };
  }
  const raw = ONE_TILE[material](base);
  const tile = material === 'glass' ? raw : matchMean(raw, base);
  return { top: tile, side: tile, bottom: tile };
}
