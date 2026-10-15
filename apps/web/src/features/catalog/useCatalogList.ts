import { useEffect, useState } from 'react';
import type { CatalogListScope } from 'shared';
import { errorMessage } from '../../lib/apiRequest';

// Список вкладки каталога. entries === null — ещё грузится (или ошибка). load и
// failText должны быть постоянными (функция модуля и строка), иначе эффект будет
// перезапускаться.
export function useCatalogList<Entry>(
  load: (scope: CatalogListScope) => Promise<Entry[]>,
  scope: CatalogListScope,
  failText: string,
): { entries: Entry[] | null; error: string | null } {
  // Список помечен вкладкой, для которой загружен: при переключении старый не мелькает,
  // и сбрасывать состояние в эффекте не нужно.
  const [loaded, setLoaded] = useState<{
    scope: CatalogListScope;
    entries: Entry[] | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    load(scope)
      .then((list) => {
        if (active) setLoaded({ scope, entries: list, error: null });
      })
      .catch((err: unknown) => {
        console.error('Failed to load catalog list', err);
        const message = errorMessage(err, failText);
        if (active) setLoaded({ scope, entries: null, error: message });
      });
    return () => {
      active = false;
    };
  }, [load, scope, failText]);

  const current = loaded?.scope === scope ? loaded : null;
  return { entries: current?.entries ?? null, error: current?.error ?? null };
}
