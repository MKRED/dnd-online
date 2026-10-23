import { Anchor } from '@mantine/core';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import type { Furniture } from 'shared';
import { ModelThumbnail } from '../../voxelModels';
import type { CatalogExtras } from '../catalogExtras';
import type { SimpleEntry } from '../simpleCatalogs';
import { modelCellsText, modelSizeText } from '../VoxelModel/modelCard';
import { mountText } from './furnitureCard';
import FurnitureFields from './FurnitureFields';
import { furnitureValidate, toFurnitureInput } from './furnitureForm';
import NoModel from './NoModel';
import PositionsPreview from './PositionsPreview';

const isFurniture = (entry: SimpleEntry): entry is Furniture =>
  'mount' in entry;

// Свои поля раздела «Обстановка» (docs/plan/blocks.md, этапы 8б и 8г). Картинка записи —
// её модель: на карточке и в форме вращается (с положениями — с переключателем), в
// списке — миниатюра модели первого положения.
export const FURNITURE_EXTRAS: CatalogExtras = {
  Field: FurnitureFields,
  validate: { furniture: furnitureValidate },
  toInput: ({ furniture }) => toFurnitureInput(furniture),
  rows: (entry) => {
    if (!isFurniture(entry)) return [];
    const { model } = entry;
    const modelLink = (id: string) => {
      const found = entry.models[id];
      return found ? (
        <Anchor component={Link} to={`/models/${found.id}`} size="sm">
          {found.name}
        </Anchor>
      ) : (
        'удалена'
      );
    };
    // С положениями модель у каждого своя: строка на положение вместо строки «Модель».
    const models = entry.positions.length
      ? [
          {
            label: 'Положения',
            // Значение карточки лежит внутри абзаца: строки — через перенос, не блоками.
            value: entry.positions.map((position, index) => (
              <Fragment key={position.name}>
                {index > 0 && <br />}
                {position.name} — {modelLink(position.modelId)}
              </Fragment>
            )),
          },
        ]
      : [
          {
            label: 'Модель',
            value: model
              ? modelLink(model.id)
              : 'Удалена — обстановка без вида',
          },
        ];
    return [
      ...models,
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
      if (size === 'card')
        return (
          <PositionsPreview
            model={entry.model}
            positions={entry.positions.map(({ name, modelId }) => ({
              name,
              model: entry.models[modelId] ?? null,
            }))}
            empty="Модель удалена"
          />
        );
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
    values: ({ furniture }) => (
      <PositionsPreview
        model={furniture.model}
        positions={furniture.positions}
        empty="Выберите модель"
      />
    ),
  },
};
