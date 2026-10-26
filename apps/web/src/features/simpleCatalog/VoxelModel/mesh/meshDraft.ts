import {
  bytesToBase64,
  defaultMeshFit,
  encodeVoxels,
  modelVoxelCount,
  STL_DEFAULT_COLOR,
  type ModelMeshFit,
  type ModelMeshFormat,
  type Vec3,
  type VoxelModel,
  type VoxelModelFields,
} from 'shared';
import type { CompressResult } from '../../../modelCompress';
import { meshVoxelsKey, type MeshSource } from '../../../voxelModels';

// Загруженный файл модели в форме (docs/plan/blocks.md, этап 9): выбранный файл или
// сохранённый, цвет STL и вписывание. Сохраняет их кнопка формы (saveModelMesh).
// voxelsKey — по чему посчитаны воксели в форме: не совпал с текущим — они ещё считаются.
export interface MeshDraft {
  source: MeshSource;
  format: ModelMeshFormat;
  color: string | null;
  fit: ModelMeshFit;
  voxelsKey: string | null;
  // Файл сжат в браузере (docs/plan/done/monster-models.md, этап 3): что было и что стало.
  compressed?: CompressResult;
}

// Сохранённые воксели посчитаны по сохранённому файлу: пересчитывать при открытии формы
// не нужно.
export function toMeshDraft(entry: VoxelModel | null): MeshDraft | null {
  const mesh = entry?.mesh;
  if (!entry || !mesh) return null;
  const source: MeshSource = {
    kind: 'stored',
    modelId: entry.id,
    version: mesh.version,
    format: mesh.format,
  };
  return {
    source,
    format: mesh.format,
    color: mesh.color,
    fit: mesh.fit,
    voxelsKey: meshVoxelsKey(source, mesh.fit, entry.size, mesh.color),
  };
}

// Новый файл: формат известен по первым байтам, вписывание и цвет — по умолчанию.
export function newMeshDraft(
  file: File,
  format: ModelMeshFormat,
  compressed?: CompressResult,
): MeshDraft {
  return {
    source: { kind: 'file', file },
    format,
    color: format === 'stl' ? STL_DEFAULT_COLOR : null,
    fit: defaultMeshFit(format),
    voxelsKey: null,
    ...(compressed && { compressed }),
  };
}

export const meshDraftReady = (draft: MeshDraft, size: Vec3) =>
  draft.voxelsKey === meshVoxelsKey(draft.source, draft.fit, size, draft.color);

// Пустая сетка нового размера: пока воксели из файла считаются, форма и предпросмотр не
// должны читать сетку старого размера. Свойства клеток за новым краем пропадают.
export function resizedEmpty(
  model: VoxelModelFields,
  size: Vec3,
): VoxelModelFields {
  const cells = Object.fromEntries(
    Object.entries(model.cells).filter(([key]) =>
      key.split(',').every((v, axis) => Number(v) < size[axis]),
    ),
  );
  return {
    ...model,
    size,
    voxels: bytesToBase64(encodeVoxels(new Uint8Array(modelVoxelCount(size)))),
    cells,
  };
}
