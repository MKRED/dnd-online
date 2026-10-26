import { useState } from 'react';
import {
  MODEL_UPLOAD_MAX_BYTES,
  ModelCompressError,
  needsCompression,
  type CompressProgress,
  type CompressStats,
} from './compressLimits';
import { compressInWorker } from './compressInWorker';

export interface CompressResult {
  before: CompressStats;
  after: CompressStats;
}

export type CompressState =
  | { kind: 'idle' }
  // Файл больше 10 МБ: ждём «Сжать и загрузить» или «Отмена».
  | { kind: 'offer'; file: File }
  | { kind: 'working'; file: File; progress: CompressProgress | null }
  | { kind: 'done'; before: CompressStats; after: CompressStats }
  | { kind: 'error'; message: string };

const MAX_MB = MODEL_UPLOAD_MAX_BYTES / (1024 * 1024);

// Выбор файла модели с учётом сжатия (docs/plan/done/character-models.md, этап 5): до 10 МБ
// файл уходит как есть, от 10 до 100 МБ — с предложением сжать в браузере, больше —
// отказ. upload — что делать с готовым файлом: у персонажа — загрузить (useCharacterModel),
// в «Моделях» — взять в форму (docs/plan/done/monster-models.md, этап 3); у сжатого — с итогом.
export function useModelCompression(
  upload: (file: File, compressed?: CompressResult) => void,
  // Сжатие сбилось — форма модели снова сохраняется (MeshFileButton).
  onFailed?: () => void,
) {
  const [state, setState] = useState<CompressState>({ kind: 'idle' });

  const choose = (file: File) => {
    if (file.size > MODEL_UPLOAD_MAX_BYTES)
      return setState({
        kind: 'error',
        message: `Файл больше ${MAX_MB} МБ — такой не сжать. Упростите модель в Blender и загрузите снова.`,
      });
    if (needsCompression(file.size)) return setState({ kind: 'offer', file });
    setState({ kind: 'idle' });
    upload(file);
  };

  const compress = () => {
    if (state.kind !== 'offer') return;
    const { file } = state;
    setState({ kind: 'working', file, progress: null });
    compressInWorker(file, (progress) =>
      setState({ kind: 'working', file, progress }),
    )
      .then(({ data, before, after }) => {
        setState({ kind: 'done', before, after });
        upload(new File([data as Uint8Array<ArrayBuffer>], file.name), {
          before,
          after,
        });
      })
      .catch((err: unknown) => {
        console.error('Failed to compress the model file', err);
        onFailed?.();
        setState({
          kind: 'error',
          message:
            err instanceof ModelCompressError
              ? err.message
              : 'Не удалось сжать модель',
        });
      });
  };

  return {
    state,
    choose,
    compress,
    cancel: () => setState({ kind: 'idle' }),
  };
}
