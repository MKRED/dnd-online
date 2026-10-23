import { useCallback, useEffect, useState } from 'react';
import type { VoxelModel } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import { voxelModelsApi } from '../../voxelModels';

// Свои модели для выбора в форме обстановки (docs/plan/blocks.md, этап 8б): в
// обстановку ставится только своя модель. put — модель, которую форма только что
// нарисовала или поправила: список обновляется без нового запроса.
export function useOwnModels() {
  const [models, setModels] = useState<VoxelModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    voxelModelsApi
      .list('mine')
      .then((list) => {
        if (alive) setModels(list);
      })
      .catch((err: unknown) => {
        console.error('Failed to load own voxel models', err);
        if (alive) setError(errorMessage(err, 'Не удалось загрузить модели'));
      });
    return () => {
      alive = false;
    };
  }, []);

  const put = useCallback((model: VoxelModel) => {
    setModels((list) => [
      model,
      ...(list ?? []).filter((entry) => entry.id !== model.id),
    ]);
  }, []);

  return { models, error, put };
}

export type OwnModels = ReturnType<typeof useOwnModels>;
