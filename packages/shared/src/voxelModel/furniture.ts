import type {
  CatalogEntryFields,
  CatalogEntryInputFields,
} from '../catalog.js';
import type { CatalogOrigin } from '../catalogOrigin.js';
import type { ItemRefView } from '../map/objects/objectRefViews.js';
import type { FurnitureContainer } from './furnitureContainer.js';
import type { VoxelModelFields } from './voxelModel.js';

// Роль «обстановка» (docs/plan/blocks.md, этап 8б): стол, стул, статуя — модель из
// справочника «Модели» плюс крепление. Размер в клетках и свойства клеток для пути —
// у самой модели (решено с пользователем 2026-10-23: размер из модели, так объект
// всегда занимает ровно те клетки, где нарисован).

// Крепление: на полу стоит на опоре, на стене висит на грани блока и клеток для пути
// не занимает, на потолке — под блоком (docs/plan/blocks.md, «Понятия»). «Проём» — дверь
// и ворота (этап 8г): клетки объекта — сам проём, стоит на опоре, как на полу.
export const FURNITURE_MOUNTS = [
  'floor',
  'wall',
  'ceiling',
  'doorway',
] as const;
export type FurnitureMount = (typeof FURNITURE_MOUNTS)[number];

export const FURNITURE_MOUNT_LABELS: Record<FurnitureMount, string> = {
  floor: 'Пол',
  wall: 'Стена',
  ceiling: 'Потолок',
  doorway: 'Проём',
};

// Занимает ли обстановка клетки для пути и стоит ли на опоре: на полу и в проёме.
export const isGroundMount = (mount: FurnitureMount) =>
  mount === 'floor' || mount === 'doorway';

export function isFurnitureMount(value: unknown): value is FurnitureMount {
  return FURNITURE_MOUNTS.includes(value as FurnitureMount);
}

// Положение — своя модель под именем: «Закрыта», «Открыта» у двери, «Открыт» у сундука
// (docs/plan/blocks.md, «Модели и двери»). Все модели положений — свои.
export interface FurniturePosition {
  name: string;
  modelId: string;
}

export const FURNITURE_POSITIONS_MAX = 8;
export const FURNITURE_POSITION_NAME_MAX = 40;

// Тело записи: модель — только своя (чужую сначала копируют, как блоки). positions
// пустой — у обстановки один вид; иначе от двух положений, и первое — то, в котором
// объект ставится на карту: его модель и есть modelId.
// container — вид «Контейнер» (этап 11), null — обычная обстановка.
export interface FurnitureFields {
  modelId: string;
  mount: FurnitureMount;
  positions: FurniturePosition[];
  container: FurnitureContainer | null;
}

// Что не так с положениями — для сервера (400) и формы; null — всё в порядке.
export function checkFurniturePositions(
  fields: Pick<FurnitureFields, 'modelId' | 'positions'>,
): string | null {
  const { positions } = fields;
  if (!positions.length) return null;
  if (positions.length < 2 || positions.length > FURNITURE_POSITIONS_MAX)
    return `Положений — от 2 до ${FURNITURE_POSITIONS_MAX} или ни одного`;
  const names = new Set<string>();
  for (const { name } of positions) {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length > FURNITURE_POSITION_NAME_MAX)
      return `Название положения — от 1 до ${FURNITURE_POSITION_NAME_MAX} символов`;
    if (names.has(trimmed)) return `Положение «${trimmed}» повторяется`;
    names.add(trimmed);
  }
  if (positions[0].modelId !== fields.modelId)
    return 'Модель первого положения — модель обстановки (modelId)';
  return null;
}

// Все модели записи без повторов: основная и модели положений.
export const furnitureModelIds = (
  fields: Pick<FurnitureFields, 'modelId' | 'positions'>,
) => [...new Set([fields.modelId, ...fields.positions.map((p) => p.modelId)])];

export type FurnitureInput = CatalogEntryInputFields & FurnitureFields;

// Модель в ответе обстановки — целиком: её видят все, кто видит обстановку, даже если
// сама модель скрыта. origin — ссылка модели-копии на свой оригинал.
export type FurnitureModel = VoxelModelFields & {
  id: string;
  name: string;
  origin: CatalogOrigin | null;
};

// model null — модель удалили: обстановка остаётся, но без вида. models — модели всех
// положений по id (удалённых в нём нет). contentItems — предметы содержимого контейнера по
// id, как их видит читающий: имя, картинка и вес или заглушка.
export type Furniture = CatalogEntryFields &
  FurnitureFields & {
    model: FurnitureModel | null;
    models: Record<string, FurnitureModel>;
    contentItems: Record<string, ItemRefView>;
    origin: CatalogOrigin | null;
  };

// Где стоит модель: перед удалением автора предупреждают, какая обстановка её потеряет.
export interface VoxelModelUsage {
  furniture: { id: string; name: string }[];
  // Свои монстры с этой моделью (docs/plan/done/monster-models.md).
  monsters: { id: string; name: string }[];
}

const isPosition = (value: unknown): value is FurniturePosition =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as FurniturePosition).name === 'string' &&
  typeof (value as FurniturePosition).modelId === 'string';

// Положения из записи в базе: не список положений — у обстановки один вид.
export const readFurniturePositions = (value: unknown): FurniturePosition[] =>
  Array.isArray(value) && value.every(isPosition)
    ? value.map(({ name, modelId }) => ({ name, modelId }))
    : [];
