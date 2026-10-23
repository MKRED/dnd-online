import { isModelColor } from './voxelModel.js';

// Загруженная 3D-модель у модели справочника (docs/plan/blocks.md, этап 9): файл
// `.glb` или STL рисуется на карте как есть, а для правил из него один раз считаются
// воксели (meshVoxels.ts). Байты лежат отдельной таблицей, здесь — только то, что нужно
// нарисовать и пересчитать: формат, версия файла (по ней клиент кэширует байты), цвет STL
// и как вписать файл в клетки модели.

export const MODEL_MESH_FORMATS = ['glb', 'stl'] as const;
export type ModelMeshFormat = (typeof MODEL_MESH_FORMATS)[number];

// up — какая ось файла смотрит вверх (у glTF по стандарту Y, у STL для печати обычно Z);
// turn — поворот вокруг вертикали четвертями оборота по часовой: лицом модели на север,
// как «вперёд» воксельной модели.
export interface ModelMeshFit {
  up: 'y' | 'z';
  turn: 0 | 1 | 2 | 3;
}

export interface ModelMesh {
  format: ModelMeshFormat;
  version: number;
  // Цвет STL (#rrggbb); у `.glb` свои цвета — null.
  color: string | null;
  fit: ModelMeshFit;
}

export function defaultMeshFit(format: ModelMeshFormat): ModelMeshFit {
  return { up: format === 'glb' ? 'y' : 'z', turn: 0 };
}

export function isModelMeshFit(value: unknown): value is ModelMeshFit {
  if (typeof value !== 'object' || value === null) return false;
  const { up, turn } = value as Record<string, unknown>;
  return (
    Object.keys(value).length === 2 &&
    (up === 'y' || up === 'z') &&
    (turn === 0 || turn === 1 || turn === 2 || turn === 3)
  );
}

export function isModelMesh(value: unknown): value is ModelMesh {
  if (typeof value !== 'object' || value === null) return false;
  const { format, version, color, fit } = value as Record<string, unknown>;
  return (
    MODEL_MESH_FORMATS.includes(format as ModelMeshFormat) &&
    Number.isSafeInteger(version) &&
    (version as number) >= 1 &&
    (color === null || isModelColor(color)) &&
    isModelMeshFit(fit)
  );
}
