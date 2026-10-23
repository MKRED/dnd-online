import type { ModelMeshFit, ModelMeshFormat, Vec3 } from 'shared';

// Откуда взять файл модели (docs/plan/blocks.md, этап 9): выбранный в форме и ещё не
// загруженный или сохранённый у модели (версия — в адресе, байты кэшируются навсегда).
export type MeshSource =
  | { kind: 'file'; file: File }
  | {
      kind: 'stored';
      modelId: string;
      version: number;
      format: ModelMeshFormat;
    };

export const storedMeshPath = (modelId: string, version: number) =>
  `/voxel-models/${modelId}/mesh/file?v=${version}`;

// По чему посчитаны воксели модели с файлом: файл, вписывание, размер и цвет. Совпало —
// пересчитывать не нужно.
export function meshVoxelsKey(
  source: MeshSource,
  fit: ModelMeshFit,
  size: Vec3,
  color: string | null,
): string {
  const file =
    source.kind === 'stored'
      ? `stored:${source.modelId}:${source.version}`
      : `file:${source.file.name}:${source.file.size}:${source.file.lastModified}`;
  return [file, fit.up, fit.turn, size.join('x'), color ?? ''].join('|');
}
