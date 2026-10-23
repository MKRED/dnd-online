import type { Furniture, FurnitureMount, VoxelModelFields } from 'shared';

// Поля обстановки в форме (docs/plan/blocks.md, этап 8б): своя модель и крепление.
// model — выбранная модель целиком, для предпросмотра и размера; в запрос уходит только
// modelId. Пустой modelId — модель ещё не выбрана.
export interface FurnitureValues {
  modelId: string;
  mount: FurnitureMount;
  model: VoxelModelFields | null;
}

export const toFurnitureValues = (entry?: Furniture): FurnitureValues => ({
  modelId: entry?.model ? entry.modelId : '',
  mount: entry?.mount ?? 'floor',
  model: entry?.model ?? null,
});

export const furnitureValidate = {
  modelId: (value: string) =>
    value ? null : 'Выберите модель или нарисуйте новую',
};
