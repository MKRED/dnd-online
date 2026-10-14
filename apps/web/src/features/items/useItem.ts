import { useEffect, useState } from 'react';
import type { Item } from 'shared';
import { ApiError } from '../../lib/apiRequest';
import { getItem } from './itemsApi';

function toLoadErrorMessage(err: unknown): string {
  // 400 — id не UUID, 404 — нет такого или чужой скрытый: для пользователя одно и то же.
  if (err instanceof ApiError && (err.status === 400 || err.status === 404)) {
    return 'Предмет не найден';
  }
  return err instanceof ApiError ? err.message : 'Не удалось загрузить предмет';
}

interface Loaded {
  id: string;
  item: Item | null;
  error: string | null;
}

// Предмет для страниц просмотра и правки. Результат помечен id, для которого он
// загружен: при переходе к другому предмету старый не показывается, и сбрасывать
// состояние в эффекте не нужно.
export function useItem(id: string) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let active = true;
    getItem(id)
      .then((item) => {
        if (active) setLoaded({ id, item, error: null });
      })
      .catch((err: unknown) => {
        console.error('Failed to load item', err);
        if (active)
          setLoaded({ id, item: null, error: toLoadErrorMessage(err) });
      });
    return () => {
      active = false;
    };
  }, [id]);

  const current = loaded?.id === id ? loaded : null;
  return { item: current?.item ?? null, error: current?.error ?? null };
}
