import { MODEL_SCALE_MAX, MODEL_SCALE_MIN } from './characterModels.js';
import type { VoxelModelFields } from './voxelModel/voxelModel.js';

// 3D-модель монстра (docs/plan/done/monster-models.md): ссылка на модель справочника «Модели»
// и поправка к вписыванию в место существа. Модель — только своя, как у обстановки;
// поворот, верх файла и цвет STL — у самой модели.
export interface MonsterModelLink {
  id: string;
  // Множитель к вписанному размеру, как у модели персонажа (×0,25…×4).
  scale: number;
}

// Модель в карточке монстра: вид целиком — его видит всякий, кто видит монстра, даже если
// сама модель у автора скрыта. available — смотрящий может открыть модель в «Моделях».
export type MonsterModelView = VoxelModelFields & {
  id: string;
  name: string;
  available: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isMonsterModelLink(value: unknown): value is MonsterModelLink {
  if (typeof value !== 'object' || value === null) return false;
  const { id, scale } = value as Record<string, unknown>;
  return (
    Object.keys(value).length === 2 &&
    typeof id === 'string' &&
    UUID.test(id) &&
    typeof scale === 'number' &&
    scale >= MODEL_SCALE_MIN &&
    scale <= MODEL_SCALE_MAX
  );
}

// Испорченная ссылка в записи читается как «без модели»: карточка не падает.
export function readMonsterModelLink(value: unknown): MonsterModelLink | null {
  return isMonsterModelLink(value)
    ? { id: value.id, scale: value.scale }
    : null;
}

// Модель монстра на карте мастера и сцене: вид модели и поправка из ссылки. На карте она
// из справочника, на сцене — снимок в библиотеке игры (docs/plan/done/monster-models.md, этап
// 2); у снимка mesh.version — версия копии, по ней клиент кеширует байты из игры.
export type MonsterRefModel = VoxelModelFields & { id: string; scale: number };
