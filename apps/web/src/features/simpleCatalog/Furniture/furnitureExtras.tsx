import { Anchor, Center, Loader } from '@mantine/core';
import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import type { Furniture, VoxelModelFields } from 'shared';
import { ModelPreview, ModelThumbnail } from '../../voxelModels';
import type { CatalogExtras } from '../catalogExtras';
import type { SimpleEntry } from '../simpleCatalogs';
import { modelCellsText, modelSizeText } from '../VoxelModel/modelCard';
import { mountText } from './furnitureCard';
import FurnitureFields from './FurnitureFields';
import { furnitureValidate } from './furnitureForm';
import NoModel from './NoModel';

const isFurniture = (entry: SimpleEntry): entry is Furniture =>
  'mount' in entry;

const PREVIEW_SIZE = 260;

const preview = (model: VoxelModelFields | null, empty: string) =>
  model ? (
    <Suspense
      fallback={
        <Center w={PREVIEW_SIZE} h={PREVIEW_SIZE}>
          <Loader size="sm" />
        </Center>
      }
    >
      <ModelPreview model={model} size={PREVIEW_SIZE} />
    </Suspense>
  ) : (
    <NoModel size={PREVIEW_SIZE} text={empty} />
  );

// Свои поля раздела «Обстановка» (docs/plan/blocks.md, этап 8б). Картинка записи — её
// модель: на карточке и в форме вращается, в списке — миниатюра.
export const FURNITURE_EXTRAS: CatalogExtras = {
  Field: FurnitureFields,
  validate: { furniture: furnitureValidate },
  toInput: ({ furniture }) => ({
    modelId: furniture.modelId,
    mount: furniture.mount,
  }),
  rows: (entry) => {
    if (!isFurniture(entry)) return [];
    const { model } = entry;
    return [
      {
        label: 'Модель',
        value: model ? (
          <Anchor component={Link} to={`/models/${model.id}`} size="sm">
            {model.name}
          </Anchor>
        ) : (
          'Удалена — обстановка без вида'
        ),
      },
      ...(model
        ? [
            { label: 'Размер', value: modelSizeText(model) },
            { label: 'Свойства клеток', value: modelCellsText(model) },
          ]
        : []),
      { label: 'Крепление', value: mountText(entry.mount) },
    ];
  },
  listValue: (entry) =>
    isFurniture(entry) && entry.model
      ? `${entry.model.size[0]}×${entry.model.size[2]}×${entry.model.size[1]}`
      : null,
  picture: {
    entry: (entry, size) => {
      if (!isFurniture(entry)) return null;
      if (size === 'card') return preview(entry.model, 'Модель удалена');
      const px = size === 'grid' ? 120 : 36;
      return entry.model ? (
        <ModelThumbnail
          // Модель правят отдельно от записи обстановки: ключ — по её цветам и вокселям.
          cacheKey={`${entry.model.id}:${entry.model.palette.join('')}:${entry.model.voxels.length}`}
          model={entry.model}
          size={px}
        />
      ) : (
        <NoModel size={px} />
      );
    },
    values: ({ furniture }) => preview(furniture.model, 'Выберите модель'),
  },
};
