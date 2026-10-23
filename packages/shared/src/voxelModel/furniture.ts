import type {
  CatalogEntryFields,
  CatalogEntryInputFields,
} from '../catalog.js';
import type { CatalogOrigin } from '../catalogOrigin.js';
import type { VoxelModelFields } from './voxelModel.js';

// Роль «обстановка» (docs/plan/blocks.md, этап 8б): стол, стул, статуя — модель из
// справочника «Модели» плюс крепление. Размер в клетках и свойства клеток для пути —
// у самой модели (решено с пользователем 2026-10-23: размер из модели, так объект
// всегда занимает ровно те клетки, где нарисован).

// Крепление: на полу стоит на опоре, на стене висит на грани блока и клеток для пути
// не занимает, на потолке — под блоком (docs/plan/blocks.md, «Понятия»).
export const FURNITURE_MOUNTS = ['floor', 'wall', 'ceiling'] as const;
export type FurnitureMount = (typeof FURNITURE_MOUNTS)[number];

export const FURNITURE_MOUNT_LABELS: Record<FurnitureMount, string> = {
  floor: 'Пол',
  wall: 'Стена',
  ceiling: 'Потолок',
};

export function isFurnitureMount(value: unknown): value is FurnitureMount {
  return FURNITURE_MOUNTS.includes(value as FurnitureMount);
}

// Тело записи: модель — только своя (чужую сначала копируют, как блоки).
export interface FurnitureFields {
  modelId: string;
  mount: FurnitureMount;
}

export type FurnitureInput = CatalogEntryInputFields & FurnitureFields;

// Модель в ответе обстановки — целиком: её видят все, кто видит обстановку, даже если
// сама модель скрыта. origin — ссылка модели-копии на свой оригинал.
export type FurnitureModel = VoxelModelFields & {
  id: string;
  name: string;
  origin: CatalogOrigin | null;
};

// model null — модель удалили: обстановка остаётся, но без вида.
export type Furniture = CatalogEntryFields &
  FurnitureFields & {
    model: FurnitureModel | null;
    origin: CatalogOrigin | null;
  };

// Где стоит модель: перед удалением автора предупреждают, какая обстановка её потеряет.
export interface VoxelModelUsage {
  furniture: { id: string; name: string }[];
}
