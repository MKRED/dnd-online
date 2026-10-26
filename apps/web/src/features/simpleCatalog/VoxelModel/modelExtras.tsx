import { Center, Loader } from '@mantine/core';
import { Suspense } from 'react';
import type { VoxelModel, VoxelModelFields } from 'shared';
import {
  ModelPreview,
  ModelThumbnail,
  type PreviewMesh,
} from '../../voxelModels';
import type { CatalogExtras } from '../catalogExtras';
import type { SimpleEntry } from '../simpleCatalogs';
import { meshDraftReady } from './mesh/meshDraft';
import { saveModelMesh } from './mesh/saveModelMesh';
import ModelFields from './ModelFields';
import { modelCellsText, modelColorsText, modelSizeText } from './modelCard';

const isModel = (entry: SimpleEntry): entry is VoxelModel => 'voxels' in entry;

const PREVIEW_SIZE = 260;

const preview = (model: VoxelModelFields, mesh: PreviewMesh | null = null) => (
  <Suspense
    fallback={
      <Center w={PREVIEW_SIZE} h={PREVIEW_SIZE}>
        <Loader size="sm" />
      </Center>
    }
  >
    <ModelPreview model={model} size={PREVIEW_SIZE} mesh={mesh} />
  </Suspense>
);

// Сохранённый файл модели для карточки (этап 9).
const storedMesh = (entry: VoxelModel): PreviewMesh | null =>
  entry.mesh
    ? {
        source: {
          kind: 'stored',
          modelId: entry.id,
          version: entry.mesh.version,
          format: entry.mesh.format,
        },
        fit: entry.mesh.fit,
        color: entry.mesh.color,
      }
    : null;

// Свои поля раздела «Модели» (docs/plan/blocks.md, этапы 8а и 9). Картинка записи — сама
// модель: на карточке и в форме она вращается (загруженная — своим файлом), в списке —
// миниатюра по вокселям.
export const MODEL_EXTRAS: CatalogExtras = {
  Field: ModelFields,
  validate: {
    modelMesh: (draft, values) =>
      draft && !meshDraftReady(draft, values.model.size)
        ? 'Воксели из файла ещё считаются — подождите'
        : null,
    meshCompressing: (busy) =>
      busy ? 'Файл модели ещё сжимается — подождите' : null,
  },
  afterSave: (saved, values) =>
    isModel(saved)
      ? saveModelMesh(saved, values.modelMesh)
      : Promise.resolve(null),
  toInput: ({ model }) => ({
    size: model.size,
    palette: model.palette,
    voxels: model.voxels,
    cells: model.cells,
  }),
  rows: (entry) =>
    isModel(entry)
      ? [
          ...(entry.mesh
            ? [
                {
                  label: 'Вид',
                  value: `Загружена из файла ${entry.mesh.format === 'stl' ? 'STL' : '.glb'}; воксели для правил — из него`,
                },
              ]
            : []),
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
        preview(entry, storedMesh(entry))
      ) : (
        <ModelThumbnail
          cacheKey={`${entry.id}:${entry.updatedAt}`}
          model={entry}
          size={size === 'grid' ? 120 : 36}
        />
      )),
    values: ({ model, modelMesh }) =>
      preview(
        model,
        modelMesh && {
          source: modelMesh.source,
          fit: modelMesh.fit,
          color: modelMesh.color,
        },
      ),
  },
};
