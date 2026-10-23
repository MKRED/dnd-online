import { useEffect, useState } from 'react';
import { errorMessage } from '../../../../lib/apiRequest';
import { searchMapCatalog } from '../../mapsApi';
import type { CatalogFound, CatalogKind } from './catalogChoice';

// Поиск по каталогу для постановки (GET /map-catalog): то же правило «своё или
// опубликованное», что проверяет сервер, по 20 записей на вид. found — null, пока ответа
// на этот запрос ещё нет.
export function useMapCatalogSearch(kinds: readonly CatalogKind[], q: string) {
  const kindsKey = kinds.join(',');
  const key = `${kindsKey}|${q}`;
  const [result, setResult] = useState<{
    key: string;
    found: CatalogFound[];
  }>();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!kindsKey) return;
    let cancelled = false;
    Promise.all(
      (kindsKey.split(',') as CatalogKind[]).map((kind) =>
        searchMapCatalog(kind, q).then((entries) =>
          entries.map((entry): CatalogFound => ({ ...entry, kind })),
        ),
      ),
    )
      .then((lists) => {
        if (cancelled) return;
        setResult({ key, found: lists.flat() });
        setError(null);
      })
      .catch((err: unknown) => {
        console.error('Failed to search map catalog', err);
        if (!cancelled) setError(errorMessage(err, 'Поиск не удался'));
      });
    return () => {
      cancelled = true;
    };
  }, [kindsKey, q, key]);

  return {
    found: result?.key === key ? result.found : null,
    // Прошлый ответ, пока новый в пути: список не мигает пустым при наборе.
    last: result?.found ?? [],
    error,
  };
}
