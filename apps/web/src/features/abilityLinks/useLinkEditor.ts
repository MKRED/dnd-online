import { useState } from 'react';
import { errorMessage } from '../../lib/apiRequest';

// Правки связей существа с каталогом (способностей, снаряжения) идут по одной: пока
// запрос в пути, строка (или «Добавить») занята, ошибка показывается до следующей правки.
// Ответ сервера — список целиком.
export function useLinkEditor<E>(
  onChange: ((entries: E[]) => void) | undefined,
) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // key — id строки или 'add'. Возвращает, удалась ли правка: окну добавления это нужно,
  // чтобы показать «Добавлено».
  const run = async (
    key: string,
    request: () => Promise<E[]>,
    failure: string,
  ): Promise<boolean> => {
    setBusyId(key);
    setError(null);
    try {
      onChange?.(await request());
      return true;
    } catch (err: unknown) {
      console.error('Catalog link change failed', err);
      setError(errorMessage(err, failure));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return { busyId, error, setError, run };
}

export type LinkEditor<E> = ReturnType<typeof useLinkEditor<E>>;
