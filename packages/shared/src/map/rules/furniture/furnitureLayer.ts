import type { Box3, Vec3 } from '../../coords.js';
import type { Facing, MapObject } from '../../objects/mapObject.js';
import {
  furnitureLook,
  type FurnitureLook,
  type FurnitureRef,
  type ObjectRefs,
} from '../../objects/objectRefs.js';
import type { ShapeBox } from '../../shapes.js';
import { builtinContainerRef } from '../../../voxelModel/builtinContainers.js';
import { isGroundMount } from '../../../voxelModel/furniture.js';
import { modelCellKey } from '../../../voxelModel/voxelModel.js';
import { modelCellShapes, type ModelCellShape } from './modelCellShapes.js';

// Клетка карты, занятая обстановкой, глазами правил (docs/plan/blocks.md, этап 8в2).
export interface FurnitureCell {
  // Коробки вокселей в долях клетки: по ним лучи обзора и укрытия, как по формам блоков.
  boxes: ShapeBox[];
  // Что мешает телу существа: препятствие — вся клетка, «можно встать сверху» — до верха
  // вокселей; null — тело проходит (труднопроходимо, свободно).
  body: ShapeBox | null;
  // Верх опоры (0…1) у «можно встать сверху», иначе 0.
  surface: number;
  difficult: boolean;
}

// Клетки обстановки карты с границами всех клеток: луч тумана, не задевший границ, не
// ищет клетки вовсе — тысячи лучей не платят за обстановку, которой рядом нет.
export interface FurnitureLayer {
  cells: Map<number, FurnitureCell>;
  bounds: Box3 | null;
}

// Числовой ключ клетки: строка на каждый шаг луча стоила бы дороже самого шага.
// Координаты карты неотрицательны и меньше 4096.
const KEY_BASE = 4096;
export const furnitureCellKey = (x: number, y: number, z: number) =>
  x + KEY_BASE * (z + KEY_BASE * y);

const FULL: ShapeBox = [0, 0, 0, 1, 1, 1];

export function furnitureCellAt(
  layer: FurnitureLayer | undefined,
  [x, y, z]: Vec3,
): FurnitureCell | undefined {
  if (!layer?.bounds) return undefined;
  const { min, max } = layer.bounds;
  if (x < min[0] || y < min[1] || z < min[2]) return undefined;
  if (x > max[0] || y > max[1] || z > max[2]) return undefined;
  return layer.cells.get(furnitureCellKey(x, y, z));
}

// Склейка вокселей — работа на модель, а не на объект: десять одинаковых стульев
// считаются раз. Ключ — вид из справочника (положение двери — свой вид): обновлённый
// справочник считается заново.
const shapeCache = new WeakMap<FurnitureLook, Map<Facing, ModelCellShape[]>>();

function shapesOf(look: FurnitureLook, facing: Facing): ModelCellShape[] {
  if (!look.voxels) return [];
  let byFacing = shapeCache.get(look);
  if (!byFacing) {
    byFacing = new Map();
    shapeCache.set(look, byFacing);
  }
  let shapes = byFacing.get(facing);
  if (!shapes) {
    shapes = modelCellShapes(look.size, look.voxels, facing) ?? [];
    byFacing.set(facing, shapes);
  }
  return shapes;
}

// Свойство клетки для пути: своё у модели, иначе клетка с вокселями — препятствие.
// Обстановка на стене и потолке клеток для пути не занимает (план, «Крепление»): картина
// и люстра только закрывают вид своими вокселями. Дверь в проёме — как на полу: открытая
// проходима, потому что автор пометил клетку открытой модели «свободно».
function pathKind(
  ref: FurnitureRef,
  look: FurnitureLook,
  shape: ModelCellShape,
) {
  if (!isGroundMount(ref.mount)) return 'free';
  return look.cells[modelCellKey(...shape.cell)] ?? 'obstacle';
}

// Слой с одной клеткой больше: две обстановки в клетке (поставлены с Shift) — коробки
// обеих, мешает телу то, что мешает сильнее.
function addCell(
  cells: Map<number, FurnitureCell>,
  key: number,
  next: FurnitureCell,
) {
  const prev = cells.get(key);
  if (!prev) return cells.set(key, next);
  const body =
    prev.body === FULL || next.body === FULL
      ? FULL
      : prev.body && next.body
        ? prev.body[4] >= next.body[4]
          ? prev.body
          : next.body
        : (prev.body ?? next.body);
  cells.set(key, {
    boxes: [...prev.boxes, ...next.boxes],
    body,
    surface: body === FULL ? 0 : Math.max(prev.surface, next.surface),
    difficult: prev.difficult || next.difficult,
  });
}

// Что из объекта карты попадает в слой: обстановка — по записи справочника и положению,
// встроенный контейнер (этап 11) — как обстановка на полу; взгляд контейнера бывает и на
// 45°, а воксели ложатся на сетку только четвертями оборота.
function layerPiece(
  object: MapObject,
  refs: ObjectRefs,
): { ref: FurnitureRef; look: FurnitureLook; facing: Facing } | null {
  if (object.kind === 'furniture') {
    const ref = refs.furniture.get(object.furnitureId);
    return ref
      ? { ref, look: furnitureLook(ref, object), facing: object.facing }
      : null;
  }
  if (object.kind === 'container') {
    const ref = builtinContainerRef(object.look);
    const facing = object.facing ?? 0;
    return { ref, look: ref, facing: (facing - (facing % 90)) as Facing };
  }
  return null;
}

export function buildFurnitureLayer(
  objects: Iterable<MapObject>,
  refs: ObjectRefs,
): FurnitureLayer {
  const cells = new Map<number, FurnitureCell>();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (const object of objects) {
    const placed = layerPiece(object, refs);
    if (!placed) continue;
    const { ref, look, facing } = placed;
    for (const shape of shapesOf(look, facing)) {
      const [ox, oy, oz] = shape.offset;
      const at: Vec3 = [
        object.at[0] + ox,
        object.at[1] + oy,
        object.at[2] + oz,
      ];
      const kind = pathKind(ref, look, shape);
      addCell(cells, furnitureCellKey(...at), {
        boxes: shape.boxes,
        body:
          kind === 'obstacle'
            ? FULL
            : kind === 'stand'
              ? [0, 0, 0, 1, shape.top, 1]
              : null,
        surface: kind === 'stand' ? shape.top : 0,
        difficult: kind === 'difficult',
      });
      for (let a = 0; a < 3; a++) {
        min[a] = Math.min(min[a], at[a]);
        max[a] = Math.max(max[a], at[a]);
      }
    }
  }
  return {
    cells,
    bounds: cells.size
      ? { min: [min[0], min[1], min[2]], max: [max[0], max[1], max[2]] }
      : null,
  };
}
