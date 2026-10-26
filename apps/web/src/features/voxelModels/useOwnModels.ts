import { useCallback, useEffect, useState } from 'react';
import type { VoxelModel } from 'shared';
import { errorMessage } from '../../lib/apiRequest';
import { voxelModelsApi } from './voxelModelApi';

// Свои модели для выбора в форме обстановки (docs/plan/blocks.md, этап 8б) и монстра
// (docs/plan/done/monster-models.md): ставится только своя модель. put — модель, которую форма
// только что нарисовала или поправила: список обновляется без нового запроса.
// refreshOnFocus — перечитать список, когда вкладка снова в фокусе: модель с файлом
// правится в «Моделях» в другой вкладке.
export function useOwnModels({ refreshOnFocus = false } = {}) {
  const [models, setModels] = useState<VoxelModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      voxelModelsApi
        .list('mine')
        .then((list) => {
          if (!alive) return;
          setModels(list);
          setError(null);
        })
        .catch((err: unknown) => {
          console.error('Failed to load own voxel models', err);
          if (alive) setError(errorMessage(err, 'Не удалось загрузить модели'));
        });
    void load();
    const onFocus = () => void load();
    if (refreshOnFocus) window.addEventListener('focus', onFocus);
    return () => {
      alive = false;
      window.removeEventListener('focus', onFocus);
    };
  }, [refreshOnFocus]);

  const put = useCallback((model: VoxelModel) => {
    setModels((list) => [
      model,
      ...(list ?? []).filter((entry) => entry.id !== model.id),
    ]);
  }, []);

  return { models, error, put };
}

export type OwnModels = ReturnType<typeof useOwnModels>;
