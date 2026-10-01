import type { Rotation } from './cell.js';

// Коробка внутри клетки: [minX, minY, minZ, maxX, maxY, maxZ], координаты от 0 до 1.
export type ShapeBox = readonly [
  minX: number,
  minY: number,
  minZ: number,
  maxX: number,
  maxY: number,
  maxZ: number,
];

// Фигура — данные, а не код: одни и те же коробки нужны рендеру (грани чанка) и правилам
// (на какой высоте можно стоять, что перекрывает луч при расчёте укрытия).
// Ориентация при повороте 0: «север» — сторона z = 0 (верх экрана при виде сверху).
export const SHAPES = {
  cube: [[0, 0, 0, 1, 1, 1]],
  slab: [[0, 0, 0, 1, 0.5, 1]],
  slab_top: [[0, 0.5, 0, 1, 1, 1]],
  // Тонкая стена вдоль северного края клетки.
  wall: [[0, 0, 0, 1, 1, 0.2]],
  pillar: [[0.3, 0, 0.3, 0.7, 1, 0.7]],
  // Подъём к югу: нижняя ступень на всю клетку, верхняя — на южной половине.
  stairs: [
    [0, 0, 0, 1, 0.5, 1],
    [0, 0.5, 0.5, 1, 1, 1],
  ],
} as const satisfies Record<string, readonly ShapeBox[]>;

export type ShapeName = keyof typeof SHAPES;

export const SHAPE_NAMES = Object.keys(SHAPES) as ShapeName[];

export const SHAPE_LABELS: Record<ShapeName, string> = {
  cube: 'Блок',
  slab: 'Плита',
  slab_top: 'Верхняя плита',
  wall: 'Тонкая стена',
  pillar: 'Столб',
  stairs: 'Ступени',
};

// Поворот по часовой стрелке при виде сверху, вокруг вертикальной оси через центр клетки.
// Один шаг 90°: точка (x, z) переходит в (1 - z, x) — север уходит на восток.
function rotateQuarter(box: ShapeBox): ShapeBox {
  const [minX, minY, minZ, maxX, maxY, maxZ] = box;
  return [flip(maxZ), minY, minX, flip(minZ), maxY, maxX];
}

// 1 - 0.7 в float даёт 0.30000000000000004 — округляем, чтобы повёрнутые коробки
// точно стыковались с соседними гранями и сравнивались на равенство.
function flip(v: number): number {
  return Math.round((1 - v) * 1e6) / 1e6;
}

export function rotateBox(box: ShapeBox, rotation: Rotation): ShapeBox {
  let result = box;
  for (let i = 0; i < rotation / 90; i++) result = rotateQuarter(result);
  return result;
}

export function shapeBoxes(shape: ShapeName, rotation: Rotation): ShapeBox[] {
  return SHAPES[shape].map((box) => rotateBox(box, rotation));
}
