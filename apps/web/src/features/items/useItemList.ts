import { useEffect, useState } from 'react';
import type { Item, CatalogListScope } from 'shared';
import { errorMessage } from '../../lib/apiRequest';
import { listItems } from './itemsApi';

// Список предметов вкладки. items === null — ещё грузится (или ошибка).
export function useItemList(scope: CatalogListScope): {
  items: Item[] | null;
  error: string | null;
} {
  // Список помечен вкладкой, для которой загружен: при переключении старый не мелькает,
  // и сбрасывать состояние в эффекте не нужно.
  const [loaded, setLoaded] = useState<{
    scope: CatalogListScope;
    items: Item[] | null;
    error: string | null;
  } | null>(null);

  useEffect(() => {
    let active = true;
    listItems(scope)
      .then((list) => {
        if (active) setLoaded({ scope, items: list, error: null });
      })
      .catch((err: unknown) => {
        console.error('Failed to load items', err);
        const message = errorMessage(err, 'Не удалось загрузить предметы');
        if (active) setLoaded({ scope, items: null, error: message });
      });
    return () => {
      active = false;
    };
  }, [scope]);

  const current = loaded?.scope === scope ? loaded : null;
  return { items: current?.items ?? null, error: current?.error ?? null };
}
