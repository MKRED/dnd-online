import type { ContainerLook } from '../map/objects/mapObject.js';
import type { FurnitureRef } from '../map/objects/objectRefs.js';
import { bytesToBase64, encodeVoxels } from './voxelCodec.js';
import {
  MODEL_CELL_VOXELS,
  modelVoxelCount,
  voxelIndex,
  type ModelCellKind,
  type VoxelModelFields,
} from './voxelModel.js';

// Встроенные контейнеры — сундук, бочка, ящик и мешок для всех (docs/plan/blocks.md, этап
// 11): воксельные модели в одну клетку по размерам фигур, которыми их рисует карта
// (MapScene/objects/ContainerShape). По ним правила считают путь, опору, укрытие и обзор;
// с них же начинают свой вариант в воксельном редакторе. «Вперёд» — север, как у всех
// моделей: замок сундука спереди, на севере.

const V = MODEL_CELL_VOXELS;
const C = V / 2;

// Цвета — как у фигур на карте (containerColors.ts).
const WOOD = '#8a5a2b';
const DARK_WOOD = '#5e3a1c';
const LIGHT_WOOD = '#b08850';
const IRON = '#4a4d52';
const BRASS = '#d4a72c';
const BURLAP = '#c2a878';
const ROPE = '#7a6544';

type Paint = (x: number, y: number, z: number) => number;

function model(
  palette: string[],
  paint: Paint,
  cells: Record<string, ModelCellKind> = {},
): VoxelModelFields {
  const size: [number, number, number] = [1, 1, 1];
  const dims: [number, number, number] = [V, V, V];
  const voxels = new Uint8Array(modelVoxelCount(size));
  for (let y = 0; y < V; y++)
    for (let z = 0; z < V; z++)
      for (let x = 0; x < V; x++)
        voxels[voxelIndex(dims, x, y, z)] = paint(x + 0.5, y + 0.5, z + 0.5);
  return {
    size,
    palette,
    voxels: bytesToBase64(encodeVoxels(voxels)),
    cells,
  };
}

const within = (v: number, lo: number, hi: number) => v >= lo && v <= hi;

// Сундук 0,8 × 0,55, корпус 0,4 и приплюснутая полукруглая крышка; оковка по краям.
function chest(): VoxelModelFields {
  const halfW = 0.4 * V;
  const halfD = 0.275 * V;
  const body = 0.4 * V;
  const lid = 0.165 * V;
  return model(
    [WOOD, DARK_WOOD, IRON, BRASS],
    (x, y, z) => {
      const dx = Math.abs(x - C);
      const dz = Math.abs(z - C);
      if (dx > halfW || dz > halfD) return 0;
      const band = within(dx, 0.24 * V, 0.3 * V) || dx > halfW - 1;
      if (y <= body) {
        // Замок — спереди, на северной (−z) стороне.
        if (z < C - halfD + 1 && dx < 1.2 && y > body - 3) return 4;
        return band ? 3 : 1;
      }
      const up = (y - body) / lid;
      if (up > 1 || (dz / halfD) ** 2 + up ** 2 > 1) return 0;
      return band ? 3 : 2;
    },
    { '0,0,0': 'stand' },
  );
}

// Бочка: пузатый цилиндр высотой 0,86, радиус 0,25–0,32, четыре обруча.
function barrel(): VoxelModelFields {
  const height = 0.86 * V;
  const hoops = [0.08, 0.3, 0.56, 0.78].map((h) => h * V);
  return model(
    [WOOD, IRON],
    (x, y, z) => {
      if (y > height) return 0;
      const r = (0.25 + 0.07 * Math.sin((Math.PI * y) / height)) * V;
      if (Math.hypot(x - C, z - C) > r) return 0;
      return hoops.some((h) => Math.abs(y - h) < 0.6) ? 2 : 1;
    },
    { '0,0,0': 'stand' },
  );
}

// Ящик 0,7 со всех сторон: светлые доски и тёмная рама по рёбрам.
function crate(): VoxelModelFields {
  const half = 0.35 * V;
  const side = 0.7 * V;
  return model(
    [LIGHT_WOOD, DARK_WOOD],
    (x, y, z) => {
      const dx = Math.abs(x - C);
      const dz = Math.abs(z - C);
      if (dx > half || dz > half || y > side) return 0;
      const edges = [
        dx > half - 1.2,
        dz > half - 1.2,
        y < 1.2 || y > side - 1.2,
      ];
      return edges.filter(Boolean).length >= 2 ? 2 : 1;
    },
    { '0,0,0': 'stand' },
  );
}

// Мешок: круглое брюхо до 0,31 и перетянутая горловина на высоте 0,5. Через мешок идут
// по нему — клетка труднопроходима, а не препятствие.
function sack(): VoxelModelFields {
  const profile: [number, number][] = [
    [0, 0.0],
    [0.27, 0.05],
    [0.31, 0.13],
    [0.31, 0.24],
    [0.27, 0.34],
    [0.19, 0.42],
    [0.1, 0.47],
    [0.065, 0.5],
    [0.12, 0.58],
    [0.09, 0.61],
  ];
  const radiusAt = (h: number) => {
    for (let i = 1; i < profile.length; i++) {
      const [r0, y0] = profile[i - 1];
      const [r1, y1] = profile[i];
      if (h <= y1) return r0 + ((r1 - r0) * (h - y0)) / (y1 - y0);
    }
    return -1;
  };
  return model(
    [BURLAP, ROPE],
    (x, y, z) => {
      const h = y / V;
      const r = radiusAt(h) * V;
      if (r < 0 || Math.hypot(x - C, (z - C) / 0.85) > r) return 0;
      return Math.abs(h - 0.5) < 0.04 ? 2 : 1;
    },
    { '0,0,0': 'difficult' },
  );
}

const BUILDERS: Record<ContainerLook, () => VoxelModelFields> = {
  chest,
  barrel,
  crate,
  sack,
};

const built = new Map<ContainerLook, VoxelModelFields>();

// Модель встроенного контейнера по виду; считается один раз.
export function builtinContainerModel(look: ContainerLook): VoxelModelFields {
  let found = built.get(look);
  if (!found) {
    found = BUILDERS[look]();
    built.set(look, found);
  }
  return found;
}

const refs = new Map<ContainerLook, FurnitureRef>();

// Встроенный контейнер для правил — как запись обстановки на полу (rules/furniture).
export function builtinContainerRef(look: ContainerLook): FurnitureRef {
  let found = refs.get(look);
  if (!found) {
    const { size, cells, voxels } = builtinContainerModel(look);
    found = {
      name: look,
      mount: 'floor',
      size,
      cells,
      voxels,
      positions: [],
      container: null,
      usable: true,
    };
    refs.set(look, found);
  }
  return found;
}
