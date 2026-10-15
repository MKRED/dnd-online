import { useState } from 'react';
import type { InventoryEntry } from 'shared';
import { errorMessage } from '../../../lib/apiRequest';

// Правки инвентаря идут по одной: пока запрос в пути, строка (или «Добавить») занята,
// ошибка показывается над списком до следующей правки.
export function useInventoryEditor(
  onChange: (inventory: InventoryEntry[]) => void,
) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // key — id строки или 'add'. Возвращает, удалась ли правка: диалогу добавления это
  // нужно, чтобы показать «Добавлено».
  const run = async (
    key: string,
    request: () => Promise<InventoryEntry[]>,
    failure: string,
  ): Promise<boolean> => {
    setBusyId(key);
    setError(null);
    try {
      onChange(await request());
      return true;
    } catch (err: unknown) {
      console.error('Inventory change failed', err);
      setError(errorMessage(err, failure));
      return false;
    } finally {
      setBusyId(null);
    }
  };

  return { busyId, error, setError, run };
}
