import { useEffect, useState } from 'react';
import { detectModelFormat } from 'shared';
import { loadModel, parseModelData } from '../../maps/models/loadModel';
import type { LoadedModel } from '../../maps/models';
import { storedMeshPath, type MeshSource } from './meshSource';

export type MeshModelState =
  | { status: 'loading' }
  | { status: 'ready'; model: LoadedModel }
  | { status: 'error'; message: string };

// Выбранный файл разбирается один раз, сколько бы мест его ни показывало.
const parsedFiles = new WeakMap<File, Promise<LoadedModel>>();

async function parseFile(file: File): Promise<LoadedModel> {
  const data = await file.arrayBuffer();
  const format = detectModelFormat(new Uint8Array(data));
  if (!format)
    throw new Error('Не удалось распознать модель. Подойдут .glb и STL');
  return parseModelData(data, format);
}

function load(source: MeshSource): Promise<LoadedModel> {
  if (source.kind === 'stored')
    return loadModel(
      storedMeshPath(source.modelId, source.version),
      source.format,
    );
  let pending = parsedFiles.get(source.file);
  if (!pending) {
    pending = parseFile(source.file);
    parsedFiles.set(source.file, pending);
  }
  return pending;
}

const keyOf = (source: MeshSource | null) =>
  source === null
    ? null
    : source.kind === 'stored'
      ? `${source.modelId}:${source.version}`
      : source.file;

// Файл модели для предпросмотра и перевода в воксели; null — файла нет.
export function useMeshModel(source: MeshSource | null): MeshModelState | null {
  const key = keyOf(source);
  const [state, setState] = useState<{
    key: unknown;
    value: MeshModelState;
  } | null>(null);

  useEffect(() => {
    if (!source) return;
    let alive = true;
    load(source)
      .then((model) => {
        if (alive) setState({ key, value: { status: 'ready', model } });
      })
      .catch((err: unknown) => {
        console.error('Failed to load the model file', err);
        const message =
          err instanceof Error && err.message.startsWith('Не удалось')
            ? err.message
            : 'Не удалось прочитать файл модели';
        if (alive) setState({ key, value: { status: 'error', message } });
      });
    return () => {
      alive = false;
    };
    // Источник сравнивается по ключу: новый объект с тем же файлом — тот же файл.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!source) return null;
  return state?.key === key ? state.value : { status: 'loading' };
}
