import { MATERIALS, type MaterialName } from 'shared';
import {
  FACE_KINDS,
  materialTextures,
  type FaceKind,
  type MaterialTextures,
} from './materialTextures';
import { TILE_SIZE } from './pixels';

// Атлас базовых блоков: у каждого материала три места (верх, бок, низ), даже если
// плитка одна, — так место плитки считается без таблицы. Вокруг плитки рамка в пиксель
// из её же крайних пикселей: без неё ближайший пиксель на самом краю грани мог бы
// взяться у соседней плитки. Атлас один на все карты; свой на карту — с каталогом
// блоков (docs/plan/blocks.md, этап 3).
const PAD = 1;
const CELL = TILE_SIZE + PAD * 2;
const COLUMNS = 8;
const MATERIAL_ORDER = Object.keys(MATERIALS) as MaterialName[];
const SLOTS = MATERIAL_ORDER.length * FACE_KINDS.length;

export const ATLAS_WIDTH = COLUMNS * CELL;
export const ATLAS_HEIGHT = Math.ceil(SLOTS / COLUMNS) * CELL;

function slotOrigin(material: MaterialName, face: FaceKind): [number, number] {
  const slot =
    MATERIAL_ORDER.indexOf(material) * FACE_KINDS.length +
    FACE_KINDS.indexOf(face);
  return [(slot % COLUMNS) * CELL, Math.floor(slot / COLUMNS) * CELL];
}

// Точка плитки в координатах атласа для WebGL. s — слева направо, t — сверху вниз
// по картинке плитки, оба от 0 до 1. У текстуры three без flipY строка 0 данных —
// низ (v = 0), поэтому плитка лежит в данных «вверх ногами» и t переворачивается.
export function atlasUv(
  material: MaterialName,
  face: FaceKind,
  s: number,
  t: number,
): [number, number] {
  const [x, y] = slotOrigin(material, face);
  return [
    (x + PAD + s * TILE_SIZE) / ATLAS_WIDTH,
    (y + PAD + (1 - t) * TILE_SIZE) / ATLAS_HEIGHT,
  ];
}

function copyTile(
  atlas: Uint8Array,
  textures: MaterialTextures,
  material: MaterialName,
  face: FaceKind,
) {
  const tile = textures[face];
  const [ox, oy] = slotOrigin(material, face);
  const clamp = (v: number) => Math.min(TILE_SIZE - 1, Math.max(0, v));
  for (let row = 0; row < CELL; row++) {
    // Строка данных снизу вверх, строка плитки — сверху вниз.
    const ty = clamp(TILE_SIZE - 1 - (row - PAD));
    for (let col = 0; col < CELL; col++) {
      const tx = clamp(col - PAD);
      const from = (ty * TILE_SIZE + tx) * 4;
      const to = ((oy + row) * ATLAS_WIDTH + ox + col) * 4;
      atlas.set(tile.subarray(from, from + 4), to);
    }
  }
}

let built: Uint8Array | null = null;

// Пиксели атласа RGBA строками снизу вверх; считаются один раз за жизнь страницы.
export function atlasPixels(): Uint8Array {
  if (built) return built;
  const atlas = new Uint8Array(ATLAS_WIDTH * ATLAS_HEIGHT * 4);
  for (const material of MATERIAL_ORDER) {
    const textures = materialTextures(material);
    for (const face of FACE_KINDS) copyTile(atlas, textures, material, face);
  }
  built = atlas;
  return atlas;
}
