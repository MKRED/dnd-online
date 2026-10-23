import type { Vec3 } from '../../coords.js';
import type { Facing } from '../../objects/mapObject.js';
import type { ShapeBox } from '../../shapes.js';
import { base64ToBytes, decodeVoxels } from '../../../voxelModel/voxelCodec.js';
import {
  MODEL_CELL_VOXELS,
  modelVoxelCount,
  modelVoxelSize,
  voxelIndex,
} from '../../../voxelModel/voxelModel.js';

// Воксели одной клетки модели, склеенные в коробки (docs/plan/blocks.md, «Укрытие и обзор
// — лучами по самим вокселям»). Коробки — в долях клетки, как у форм блоков.
export interface ModelCellShape {
  // Клетка модели до поворота: по ней ищется её свойство для пути.
  cell: Vec3;
  // Сдвиг от опорной клетки обстановки после поворота.
  offset: Vec3;
  boxes: ShapeBox[];
  // Верх самого высокого вокселя клетки (0…1) — высота опоры у «можно встать сверху».
  top: number;
}

const N = MODEL_CELL_VOXELS;

// Склейка вокселей клетки в коробки: от каждого свободного вокселя тянем полосу по x,
// потом по z, потом по y, пока весь прямоугольник заполнен. Не наименьшее число коробок,
// но сплошная столешница — одна коробка, ножка — одна.
function cellBoxes(
  voxels: Uint8Array,
  dims: Vec3,
  [ox, oy, oz]: Vec3,
): [number, number, number, number, number, number][] {
  const used = new Uint8Array(N * N * N);
  const local = (x: number, y: number, z: number) => x + N * (z + N * y);
  const free = (x: number, y: number, z: number) =>
    !used[local(x, y, z)] &&
    voxels[voxelIndex(dims, ox + x, oy + y, oz + z)] !== 0;
  const boxes: [number, number, number, number, number, number][] = [];
  for (let y = 0; y < N; y++)
    for (let z = 0; z < N; z++)
      for (let x = 0; x < N; x++) {
        if (!free(x, y, z)) continue;
        let x1 = x + 1;
        while (x1 < N && free(x1, y, z)) x1++;
        const row = (yy: number, zz: number) => {
          for (let xx = x; xx < x1; xx++) if (!free(xx, yy, zz)) return false;
          return true;
        };
        let z1 = z + 1;
        while (z1 < N && row(y, z1)) z1++;
        let y1 = y + 1;
        const layer = (yy: number) => {
          for (let zz = z; zz < z1; zz++) if (!row(yy, zz)) return false;
          return true;
        };
        while (y1 < N && layer(y1)) y1++;
        for (let yy = y; yy < y1; yy++)
          for (let zz = z; zz < z1; zz++)
            for (let xx = x; xx < x1; xx++) used[local(xx, yy, zz)] = 1;
        boxes.push([x, y, z, x1, y1, z1]);
      }
  return boxes;
}

// Поворот коробки в долях клетки по часовой, если смотреть сверху, — так же, как
// rotateModelCell поворачивает сами клетки: на 90° x' = 1 − z, z' = x.
function turnBox(
  [x0, y0, z0, x1, y1, z1]: [number, number, number, number, number, number],
  facing: Facing,
): ShapeBox {
  const box = [x0 / N, y0 / N, z0 / N, x1 / N, y1 / N, z1 / N] as const;
  const [a, b, c, d, e, f] = box;
  switch (facing) {
    case 90:
      return [1 - f, b, a, 1 - c, e, d];
    case 180:
      return [1 - d, b, 1 - f, 1 - a, e, 1 - c];
    case 270:
      return [c, b, 1 - d, f, e, 1 - a];
    default:
      return box;
  }
}

// Клетка модели [x, y, z] → сдвиг от опорной клетки обстановки, повёрнутой на facing.
// По часовой, если смотреть сверху: на 90° север модели («вперёд») смотрит на восток —
// как поворот в редакторе моделей (rotateGrid).
export function rotateModelCell(
  [mx, my, mz]: Vec3,
  [sx, , sz]: Vec3,
  facing: Facing,
): Vec3 {
  switch (facing) {
    case 90:
      return [sz - 1 - mz, my, mx];
    case 180:
      return [sx - 1 - mx, my, sz - 1 - mz];
    case 270:
      return [mz, my, sx - 1 - mx];
    default:
      return [mx, my, mz];
  }
}

// Клетки модели с вокселями, повёрнутые на facing. Пустые клетки не попадают; null —
// воксели испорчены (модель без вида, как удалённая).
export function modelCellShapes(
  size: Vec3,
  encoded: string,
  facing: Facing,
): ModelCellShape[] | null {
  const bytes = base64ToBytes(encoded);
  const voxels = bytes && decodeVoxels(bytes, modelVoxelCount(size));
  if (!voxels) return null;
  const dims = modelVoxelSize(size);
  const shapes: ModelCellShape[] = [];
  for (let my = 0; my < size[1]; my++)
    for (let mz = 0; mz < size[2]; mz++)
      for (let mx = 0; mx < size[0]; mx++) {
        const cell: Vec3 = [mx, my, mz];
        const raw = cellBoxes(voxels, dims, [mx * N, my * N, mz * N]);
        if (raw.length === 0) continue;
        shapes.push({
          cell,
          offset: rotateModelCell(cell, size, facing),
          boxes: raw.map((box) => turnBox(box, facing)),
          top: Math.max(...raw.map((box) => box[4])) / N,
        });
      }
  return shapes;
}
