import { useCallback, useEffect, useRef, useState } from 'react';
import type { CharacterModel, CharacterModelPatch } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import {
  deleteCharacterModel,
  getCharacterModel,
  patchCharacterModel,
  uploadCharacterModel,
} from './characterModelApi';

// Пауза перед сохранением поправки: ползунок масштаба шлёт десятки изменений в секунду.
const SAVE_DELAY_MS = 500;

export type ModelBusy = 'upload' | 'delete' | 'save' | null;

// Модель персонажа в форме: загрузка, замена, удаление сразу, а цвет и поправка —
// с паузой; предпросмотр показывает правку сразу, не дожидаясь сервера.
export function useCharacterModel(characterId: string) {
  const [model, setModel] = useState<CharacterModel | null | undefined>();
  const [busy, setBusy] = useState<ModelBusy>(null);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<{ patch: CharacterModelPatch; timer: number } | null>(
    null,
  );

  useEffect(() => {
    let alive = true;
    getCharacterModel(characterId)
      .then((loaded) => alive && setModel(loaded))
      .catch((err: unknown) => {
        console.error('Failed to load character model', err);
        if (alive) setError(errorMessage(err, 'Не удалось загрузить модель'));
        if (alive) setModel(null);
      });
    return () => {
      alive = false;
    };
  }, [characterId]);

  const flush = useCallback(() => {
    const queued = pending.current;
    if (!queued) return;
    pending.current = null;
    window.clearTimeout(queued.timer);
    setBusy('save');
    patchCharacterModel(characterId, queued.patch)
      .then((saved) =>
        // Пока шёл запрос, пользователь мог подвинуть ползунок дальше — его правку
        // ответ сервера не перетирает.
        setModel((current) => (pending.current ? current : saved)),
      )
      .catch((err: unknown) => {
        console.error('Failed to save character model fit', err);
        setError(errorMessage(err, 'Не удалось сохранить поправку модели'));
      })
      .finally(() => setBusy(null));
  }, [characterId]);

  // Уходя со страницы, не теряем последнюю правку.
  useEffect(() => () => flush(), [flush]);

  const change = (patch: CharacterModelPatch) => {
    setError(null);
    setModel((current) => current && { ...current, ...patch });
    const merged = { ...pending.current?.patch, ...patch };
    if (pending.current) window.clearTimeout(pending.current.timer);
    pending.current = {
      patch: merged,
      timer: window.setTimeout(flush, SAVE_DELAY_MS),
    };
  };

  const run = (kind: ModelBusy, work: () => Promise<CharacterModel | null>) => {
    // Поправка старой модели к новому файлу не относится: новый получит свою.
    if (pending.current) window.clearTimeout(pending.current.timer);
    pending.current = null;
    setError(null);
    setBusy(kind);
    work()
      .then(setModel)
      .catch((err: unknown) => {
        console.error('Character model request failed', err);
        setError(errorMessage(err, 'Не удалось изменить модель'));
      })
      .finally(() => setBusy(null));
  };

  return {
    model,
    busy,
    error,
    upload: (file: File) =>
      run('upload', () => uploadCharacterModel(characterId, file)),
    remove: () =>
      run('delete', () => deleteCharacterModel(characterId).then(() => null)),
    change,
  };
}
