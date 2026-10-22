import { useEffect, useState } from 'react';
import type { CharacterModelFormat } from 'shared';
import { loadModel, type LoadedModel } from './loadModel';

export type ModelState =
  | { status: 'loading' }
  | { status: 'ready'; model: LoadedModel }
  | { status: 'error' };

// Модель по адресу файла; null — модели нет. Ошибка разбора — 'error': вместо модели
// остаётся то, что было без неё (карточка на карте, сообщение в форме).
export function useModel(
  path: string | null,
  format: CharacterModelFormat | null,
): ModelState | null {
  const [state, setState] = useState<{
    path: string;
    value: ModelState;
  } | null>(null);

  useEffect(() => {
    if (!path || !format) return;
    let alive = true;
    loadModel(path, format)
      .then((model) => {
        if (alive) setState({ path, value: { status: 'ready', model } });
      })
      .catch((err: unknown) => {
        console.error('Failed to load 3D model', { path, err });
        if (alive) setState({ path, value: { status: 'error' } });
      });
    return () => {
      alive = false;
    };
  }, [path, format]);

  if (!path || !format) return null;
  return state?.path === path ? state.value : { status: 'loading' };
}
