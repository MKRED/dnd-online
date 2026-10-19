import { useState } from 'react';
import type { CharacterAbilityEntry } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import { removeAbility, updateAbility } from './abilitiesApi';
import type { AbilityRowHandlers } from './AbilityRow';

// Правки способностей идут по одной: пока запрос в пути, строка (или «Добавить») занята,
// ошибка показывается до следующей правки. Ответ сервера — список целиком.
export function useAbilitiesEditor(
  characterId: string,
  onChange: ((abilities: CharacterAbilityEntry[]) => void) | undefined,
) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // key — id строки или 'add'. Возвращает, удалась ли правка: окну добавления это нужно,
  // чтобы показать «Добавлено».
  const run = async (
    key: string,
    request: () => Promise<CharacterAbilityEntry[]>,
    failure: string,
  ): Promise<boolean> => {
    setBusyId(key);
    setError(null);
    try {
      onChange?.(await request());
      return true;
    } catch (err: unknown) {
      console.error('Character ability change failed', err);
      setError(errorMessage(err, failure));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  // Убираем без подтверждения: вернуть способность — пара кликов в окне добавления.
  const handlers: AbilityRowHandlers = {
    busyId,
    onPrepare: onChange
      ? (entry, prepared) =>
          void run(
            entry.id,
            () => updateAbility(characterId, entry.id, { prepared }),
            'Не удалось отметить подготовку',
          )
      : undefined,
    onRemove: onChange
      ? (entry) =>
          void run(
            entry.id,
            () => removeAbility(characterId, entry.id),
            'Не удалось убрать способность',
          )
      : undefined,
  };

  return { busyId, error, setError, run, handlers };
}
