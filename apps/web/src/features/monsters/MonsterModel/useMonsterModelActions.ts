import { useState } from 'react';
import type { VoxelModel, VoxelModelFields } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import {
  loadMeshToModel,
  uploadModelMesh,
  voxelModelsApi,
  type OwnModels,
} from '../../voxelModels';

// Что рисуется в редакторе: новая модель (target — null) или правка своей.
export type ModelEditing = {
  model: VoxelModelFields;
  target: VoxelModel | null;
};

type Busy = 'upload' | 'draw' | 'edit' | null;

interface Options {
  own: OwnModels;
  // Имя новой модели — имя монстра в форме сейчас.
  newName: () => string;
  footprint: number;
  onChoose: (model: VoxelModel) => void;
}

const newEntry = (name: string) => ({
  name,
  description: '',
  sources: [],
  isPublic: false,
});

// Модель из формы монстра (docs/plan/done/monster-models.md, этап 4): загруженный файл и
// нарисованная модель сразу сохраняются в «Модели» под именем монстра, правка рисованной —
// тоже; форма монстра хранит только ссылку. Так же сделано у обстановки (ModelPicker).
export function useMonsterModelActions({
  own,
  newName,
  footprint,
  onChoose,
}: Options) {
  const [editing, setEditing] = useState<ModelEditing | null>(null);
  const [busy, setBusy] = useState<Busy>(null);
  const [error, setError] = useState<string | null>(null);

  const run = (kind: Busy, work: () => Promise<VoxelModel>) => {
    setBusy(kind);
    setError(null);
    work()
      .then((saved) => {
        own.put(saved);
        onChoose(saved);
      })
      .catch((err: unknown) => {
        console.error('Failed to save the monster model', err);
        setError(errorMessage(err, 'Не удалось сохранить модель'));
      })
      .finally(() => setBusy(null));
  };

  // Сначала запись с вокселями из файла, потом сам файл: без записи файлу некуда лечь.
  const upload = (file: File) =>
    run('upload', async () => {
      const meshToModel = await loadMeshToModel();
      const { fields } = await meshToModel(file, footprint);
      const created = await voxelModelsApi.create({
        ...newEntry(newName()),
        ...fields,
      });
      try {
        const mesh = await uploadModelMesh(created.id, file);
        return { ...created, mesh };
      } catch (err) {
        // Без файла в «Моделях» осталась бы безликая воксельная модель — убираем её.
        await voxelModelsApi.remove(created.id).catch((removeErr: unknown) => {
          console.error('Failed to remove the model without a file', removeErr);
        });
        throw err;
      }
    });

  const save = (result: VoxelModelFields) => {
    const target = editing?.target ?? null;
    run(target ? 'edit' : 'draw', () =>
      target
        ? voxelModelsApi.update(target.id, {
            name: target.name,
            description: target.description,
            sources: target.sources,
            isPublic: target.isPublic,
            ...result,
          })
        : voxelModelsApi.create({ ...newEntry(newName()), ...result }),
    );
  };

  return {
    editing,
    setEditing,
    busy,
    error,
    setError,
    upload,
    save,
  };
}
