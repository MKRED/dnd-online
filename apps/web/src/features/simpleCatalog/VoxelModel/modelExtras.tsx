import { Center, Loader } from '@mantine/core';
import { Suspense } from 'react';
import type { VoxelModel, VoxelModelFields } from 'shared';
import { ModelPreview, ModelThumbnail } from '../../voxelModels';
import type { CatalogExtras } from '../catalogExtras';
import type { SimpleEntry } from '../simpleCatalogs';
import ModelFields from './ModelFields';
import { modelCellsText, modelColorsText, modelSizeText } from './modelCard';

const isModel = (entry: SimpleEntry): entry is VoxelModel => 'voxels' in entry;

const PREVIEW_SIZE = 260;

const preview = (model: VoxelModelFields) => (
  <Suspense
    fallback={
      <Center w={PREVIEW_SIZE} h={PREVIEW_SIZE}>
        <Loader size="sm" />
      </Center>
    }
  >
    <ModelPreview model={model} size={PREVIEW_SIZE} />
  </Suspense>
);

// Свои поля раздела «Модели» (docs/plan/blocks.md, этап 8а). Картинка записи — сама
// модель: на карточке и в форме она вращается, в списке — миниатюра.
export const MODEL_EXTRAS: CatalogExtras = {
  Field: ModelFields,
  toInput: ({ model }) => ({
    size: model.size,
    palette: model.palette,
    voxels: model.voxels,
    cells: model.cells,
  }),
  rows: (entry) =>
    isModel(entry)
      ? [
          { label: 'Размер', value: modelSizeText(entry) },
          { label: 'Цвета', value: modelColorsText(entry) },
          { label: 'Свойства клеток', value: modelCellsText(entry) },
        ]
      : [],
  // Как на карточке: ширина × глубина × высота.
  listValue: (entry) =>
    isModel(entry)
      ? `${entry.size[0]}×${entry.size[2]}×${entry.size[1]}`
      : null,
  picture: {
    entry: (entry, size) =>
      isModel(entry) &&
      (size === 'card' ? (
        preview(entry)
      ) : (
        <ModelThumbnail
          cacheKey={`${entry.id}:${entry.updatedAt}`}
          model={entry}
          size={size === 'grid' ? 120 : 36}
        />
      )),
    values: ({ model }) => preview(model),
  },
};
