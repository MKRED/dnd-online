import type { SearchKind, SearchResult } from 'shared';
import { apiRequest } from '../../lib/apiRequest';

// Общий поиск по разделам (GET /search). signal — чтобы ответ на старый запрос не
// перебил свежий, пока игрок печатает.
export function searchAll(
  q: string,
  {
    kind,
    limit,
    signal,
  }: { kind?: SearchKind; limit?: number; signal?: AbortSignal },
): Promise<SearchResult> {
  const params = new URLSearchParams({ q });
  if (kind) params.set('kind', kind);
  if (limit) params.set('limit', String(limit));
  return apiRequest(`/search?${params}`, { signal });
}
