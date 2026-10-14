import { useMemo } from 'react';
import type { Item } from 'shared';
import { useAuth } from '../../../auth';
import { useItemList } from '../../useItemList';
import { packCandidates } from './packContents';

// Предметы, которые можно положить в набор: те же списки «Мои» и «Каталог», что и на
// странице предметов. Поиск — на клиенте, как у фильтров каталога.
export function usePackCandidates(selfId: string | null): {
  candidates: { mine: Item[]; others: Item[] } | null;
  error: string | null;
} {
  const { user } = useAuth();
  const mine = useItemList('mine');
  const catalog = useItemList('catalog');
  const candidates = useMemo(
    () =>
      mine.items && catalog.items && user
        ? packCandidates(mine.items, catalog.items, user.id, selfId)
        : null,
    [mine.items, catalog.items, user, selfId],
  );
  return { candidates, error: mine.error ?? catalog.error };
}
