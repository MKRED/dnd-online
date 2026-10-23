import type { Vec3 } from '../map/coords.js';
import type { ModelMesh } from './modelMesh.js';

// Модель из вокселей — справочник «Модели» (docs/plan/blocks.md, «Модели и двери»,
// этап 8а). Только вид и свойства клеток для пути; что это в игре (обстановка, дверь,
// контейнер), решает роль, которая на модель ссылается.

// Размер в клетках карты по каждой оси, 16 вокселей на клетку (решено 2026-10-22).
export const MODEL_SIZE_MAX = 8;
export const MODEL_CELL_VOXELS = 16;
// Воксель — байт: 0 — пусто, остальное — цвет палитры.
export const MODEL_PALETTE_MAX = 255;
// Предел сжатых вокселей в base64: 128³ сплошного шума не сжать, а настоящая модель
// 8×8×8 укладывается с запасом. Тело запроса сервер принимает до 2 МБ.
export const MODEL_VOXELS_MAX_LENGTH = 1_500_000;

// Свойство клетки модели для пути. Нет записи — «как есть»: клетка с вокселями —
// препятствие, пустая — свободна.
export const MODEL_CELL_KINDS = [
  'obstacle',
  'difficult',
  'free',
  'stand',
] as const;
export type ModelCellKind = (typeof MODEL_CELL_KINDS)[number];

export const MODEL_CELL_KIND_LABELS: Record<ModelCellKind, string> = {
  obstacle: 'Препятствие',
  difficult: 'Труднопроходимо',
  free: 'Свободно',
  stand: 'Можно встать сверху',
};

// «Вперёд» у модели — всегда на север (−z), как взгляд фигурки с направлением 0: так
// положения двери и поворот на карте совпадают без отдельного поля. Развернуть модель
// автор может кнопкой поворота в редакторе.
export interface VoxelModelFields {
  // Клетки по x (ширина), y (высота) и z (глубина).
  size: Vec3;
  palette: string[];
  // Сжатые воксели (voxelCodec.ts) в base64. Порядок: x быстрее всех, потом z, потом y —
  // слой по высоте лежит подряд, как срез редактора.
  voxels: string;
  // Свои свойства клеток: ключ «x,y,z» в клетках модели.
  cells: Record<string, ModelCellKind>;
  // Загруженный файл (этап 9): есть — модель рисуется им, а воксели посчитаны из него для
  // правил. Меняют его только маршруты файла, не тело записи.
  mesh?: ModelMesh;
}

// Воксели модели по каждой оси.
export function modelVoxelSize(size: Vec3): Vec3 {
  return [
    size[0] * MODEL_CELL_VOXELS,
    size[1] * MODEL_CELL_VOXELS,
    size[2] * MODEL_CELL_VOXELS,
  ];
}

export function modelVoxelCount(size: Vec3): number {
  const [x, y, z] = modelVoxelSize(size);
  return x * y * z;
}

export function voxelIndex(voxelSize: Vec3, x: number, y: number, z: number) {
  return x + voxelSize[0] * (z + voxelSize[2] * y);
}

export const modelCellKey = (x: number, y: number, z: number) =>
  `${x},${y},${z}`;

export function isModelSize(value: unknown): value is Vec3 {
  return (
    Array.isArray(value) &&
    value.length === 3 &&
    value.every(
      (n) => Number.isInteger(n) && n >= 1 && (n as number) <= MODEL_SIZE_MAX,
    )
  );
}

export function isModelColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

export function isModelPalette(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length <= MODEL_PALETTE_MAX &&
    value.every(isModelColor)
  );
}

export function isModelCellKind(value: unknown): value is ModelCellKind {
  return MODEL_CELL_KINDS.includes(value as ModelCellKind);
}

// Ключи клеток — целые «x,y,z» внутри размера: размер проверяет checkVoxelModel.
export function isModelCells(
  value: unknown,
): value is Record<string, ModelCellKind> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  return Object.entries(value).every(
    ([key, kind]) => /^\d+,\d+,\d+$/.test(key) && isModelCellKind(kind),
  );
}
