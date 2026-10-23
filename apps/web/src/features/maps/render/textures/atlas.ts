import { MATERIALS, type BlockCatalog, type MaterialName } from 'shared';
import {
  FACE_KINDS,
  materialTextures,
  type FaceKind,
  type MaterialTextures,
} from './materialTextures';
import { hasHoles } from './customTiles';
import { TILE_SIZE } from './pixels';

// Атлас блоков карты (docs/plan/blocks.md, «Как рисуем текстуры» и этап 4б). У каждого
// набора плиток три места (верх, бок, низ), даже если плитка одна, — так место плитки
// считается без таблицы. Вокруг плитки рамка в пиксель из её же крайних пикселей: без
// неё ближайший пиксель на самом краю грани мог бы взяться у соседней плитки.
//
// Размер атласа постоянный, а места выдаются по мере надобности и не освобождаются:
// так UV уже собранных чанков остаются верными, когда на карте появляется новый блок.
// Первые места — базовые материалы, по порядку MATERIALS.
const PAD = 1;
const CELL = TILE_SIZE + PAD * 2;
const COLUMNS = 32;
const ROWS = 32;
const SET_CAPACITY = Math.floor((COLUMNS * ROWS) / FACE_KINDS.length);
const MATERIAL_ORDER = Object.keys(MATERIALS) as MaterialName[];

export const ATLAS_WIDTH = COLUMNS * CELL;
export const ATLAS_HEIGHT = ROWS * CELL;

// Номер набора плиток базового материала — тот же во всех атласах.
export function materialSet(material: MaterialName): number {
  return MATERIAL_ORDER.indexOf(material);
}

function slotOrigin(set: number, face: FaceKind): [number, number] {
  const slot = set * FACE_KINDS.length + FACE_KINDS.indexOf(face);
  return [(slot % COLUMNS) * CELL, Math.floor(slot / COLUMNS) * CELL];
}

// Точка плитки в координатах атласа для WebGL. s — слева направо, t — сверху вниз
// по картинке плитки, оба от 0 до 1. У текстуры three без flipY строка 0 данных —
// низ (v = 0), поэтому плитка лежит в данных «вверх ногами» и t переворачивается.
export function atlasUv(
  set: number,
  face: FaceKind,
  s: number,
  t: number,
): [number, number] {
  const [x, y] = slotOrigin(set, face);
  return [
    (x + PAD + s * TILE_SIZE) / ATLAS_WIDTH,
    (y + PAD + (1 - t) * TILE_SIZE) / ATLAS_HEIGHT,
  ];
}

function copyTile(
  atlas: Uint8Array,
  textures: MaterialTextures,
  set: number,
  face: FaceKind,
) {
  const tile = textures[face];
  const [ox, oy] = slotOrigin(set, face);
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

let basePixels: Uint8Array | null = null;

// Базовые материалы — одни на все атласы: считаются один раз за жизнь страницы.
function baseAtlasPixels(): Uint8Array {
  if (basePixels) return basePixels;
  const pixels = new Uint8Array(ATLAS_WIDTH * ATLAS_HEIGHT * 4);
  MATERIAL_ORDER.forEach((material, set) => {
    const textures = materialTextures(material);
    for (const face of FACE_KINDS) copyTile(pixels, textures, set, face);
  });
  basePixels = pixels;
  return pixels;
}

// Набор плиток в атласе и есть ли в его плитках дыры (рисуется с alphaTest).
export interface AtlasSet {
  set: number;
  holes: boolean;
}

// Пиксели атласа RGBA строками снизу вверх и выданные места. version растёт с каждым
// новым набором — по нему текстура видеокарты узнаёт, что пиксели пора перезалить.
export class BlockAtlas {
  readonly pixels = new Uint8Array(baseAtlasPixels());
  version = 0;
  private readonly sets = new Map<string, AtlasSet>();
  private next = MATERIAL_ORDER.length;

  // Место набора плиток своего блока: key — id группы или имя формы со своим видом
  // (BlockInfo.tiles), tiles зовётся один раз.
  // null — атлас полон (на одной карте больше трёхсот своих групп): блок рисуется
  // плитками своей основы.
  setFor(key: string, tiles: () => MaterialTextures): AtlasSet | null {
    const known = this.sets.get(key);
    if (known) return known;
    if (this.next >= SET_CAPACITY) return null;
    const textures = tiles();
    const placed = { set: this.next++, holes: hasHoles(textures) };
    for (const face of FACE_KINDS)
      copyTile(this.pixels, textures, placed.set, face);
    this.sets.set(key, placed);
    this.version++;
    return placed;
  }
}

const atlases = new WeakMap<BlockCatalog, BlockAtlas>();

// Атлас на каталог блоков карты: свои группы у каждого владельца свои, а правка группы
// приходит новым каталогом — и новым атласом, и пересборкой чанков (chunkMeshCache).
export function atlasFor(catalog: BlockCatalog): BlockAtlas {
  let atlas = atlases.get(catalog);
  if (!atlas) {
    atlas = new BlockAtlas();
    atlases.set(catalog, atlas);
  }
  return atlas;
}
