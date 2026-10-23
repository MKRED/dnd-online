import { randomId } from '@mantine/hooks';
import {
  checkFurnitureContainer,
  type Furniture,
  type FurnitureContainer,
  type FurnitureMount,
  type FurnitureFields,
  type ItemRefView,
  type VoxelModelFields,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

// Положение в форме (docs/plan/blocks.md, этап 8г): имя и своя модель. key — для списка
// React, model — для предпросмотра, в запрос уходят только имя и modelId.
export interface PositionValues {
  key: string;
  name: string;
  modelId: string;
  model: VoxelModelFields | null;
}

// Поля обстановки в форме (docs/plan/blocks.md, этапы 8б и 8г): своя модель, крепление
// и положения. model — выбранная модель целиком, для предпросмотра и размера; в запрос
// уходит только modelId. Пустой modelId — модель ещё не выбрана. Есть положения —
// модель обстановки берётся из первого из них.
export interface FurnitureValues {
  modelId: string;
  mount: FurnitureMount;
  model: VoxelModelFields | null;
  positions: PositionValues[];
  // Вид «Контейнер» (этап 11); null — обычная обстановка. contentItems — имена и вес
  // предметов содержимого для списка и груза; в запрос не уходят.
  container: FurnitureContainer | null;
  contentItems: Record<string, ItemRefView>;
}

export const positionValues = (
  name: string,
  modelId = '',
  model: VoxelModelFields | null = null,
): PositionValues => ({ key: randomId(), name, modelId, model });

export const toFurnitureValues = (entry?: Furniture): FurnitureValues => ({
  modelId: entry?.model ? entry.modelId : '',
  mount: entry?.mount ?? 'floor',
  model: entry?.model ?? null,
  positions: (entry?.positions ?? []).map(({ name, modelId }) => {
    const model = entry?.models[modelId] ?? null;
    return positionValues(name, model ? modelId : '', model);
  }),
  container: entry?.container ?? null,
  contentItems: entry?.contentItems ?? {},
});

// Новый контейнер в форме: вместимость сундука (docs/dnd/items.md), без замка и пустой.
export const NEW_CONTAINER: FurnitureContainer = {
  capacity: 360,
  lockDc: null,
  contents: [],
};

// Первые два положения, когда их включают: у двери — «Закрыта» и «Открыта», первое —
// с уже выбранной моделью.
export function startPositions(values: FurnitureValues): PositionValues[] {
  const [first, second] =
    values.mount === 'doorway'
      ? ['Закрыта', 'Открыта']
      : ['Положение 1', 'Положение 2'];
  return [
    positionValues(first, values.modelId, values.model),
    positionValues(second),
  ];
}

export function toFurnitureInput(values: FurnitureValues): FurnitureFields {
  const { positions, mount } = values;
  const { container } = values;
  if (!positions.length)
    return { modelId: values.modelId, mount, positions: [], container };
  return {
    modelId: positions[0].modelId,
    mount,
    container,
    positions: positions.map(({ name, modelId }) => ({
      name: name.trim(),
      modelId,
    })),
  };
}

const sameName = (a: string, b: string) => a.trim() === b.trim();

const containerError = (container: FurnitureContainer | null) =>
  container && checkFurnitureContainer(container);

export const furnitureValidate = {
  container: (value: FurnitureContainer | null) => containerError(value),
  modelId: (value: string, values: SimpleFormValues) =>
    value || values.furniture.positions.length
      ? null
      : 'Выберите модель или нарисуйте новую',
  positions: {
    name: (value: string, values: SimpleFormValues) => {
      if (!value.trim()) return 'Назовите положение';
      const same = values.furniture.positions.filter((p) =>
        sameName(p.name, value),
      );
      return same.length > 1 ? 'Такое положение уже есть' : null;
    },
    modelId: (value: string) =>
      value ? null : 'Выберите модель или нарисуйте новую',
  },
};
