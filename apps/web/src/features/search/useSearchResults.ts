import { useDebouncedValue } from '@mantine/hooks';
import { useEffect, useState } from 'react';
import type { SearchKind, SearchResult } from 'shared';
import { errorMessage } from '../../lib/apiRequest';
import { searchAll } from './searchApi';

// Короче — слишком много совпадений, чтобы они чем-то помогли.
export const SEARCH_MIN_LENGTH = 2;
const DEBOUNCE_MS = 200;

interface Answer {
  // Запрос, на который пришёл ответ: пока печатают, старый ответ ещё на экране.
  query: string;
  result: SearchResult | null;
  error: string | null;
}

export interface SearchState extends Answer {
  // Ответ на последний запрос ещё не пришёл.
  loading: boolean;
}

const IDLE: Answer = { query: '', result: null, error: null };

// Результаты поиска по мере набора: запрос уходит, когда пауза в печати дольше
// DEBOUNCE_MS; ответ на устаревший запрос отменяется.
export function useSearchResults(
  input: string,
  options: { kind?: SearchKind; limit?: number } = {},
): SearchState {
  const { kind, limit } = options;
  const [debounced] = useDebouncedValue(input.trim(), DEBOUNCE_MS);
  const [answer, setAnswer] = useState<Answer>(IDLE);
  const active = debounced.length >= SEARCH_MIN_LENGTH;

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    searchAll(debounced, { kind, limit, signal: controller.signal })
      .then((result) => setAnswer({ query: debounced, result, error: null }))
      .catch((err: unknown) => {
        // Отменили сами: запрос устарел, свежий уже в пути.
        if (controller.signal.aborted) return;
        console.error('Search failed', { query: debounced, err });
        setAnswer({
          query: debounced,
          result: null,
          error: errorMessage(err, 'Не удалось выполнить поиск'),
        });
      });
    return () => controller.abort();
  }, [active, debounced, kind, limit]);

  if (!active) return { ...IDLE, loading: false };
  return { ...answer, loading: answer.query !== debounced };
}
