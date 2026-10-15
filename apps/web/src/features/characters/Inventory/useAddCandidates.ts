import { useMemo } from 'react';
import type { Item } from 'shared';
import { useAuth } from '../../auth';
import { useItemList } from '../../items';
import { inventoryCandidates } from './inventoryView';

// Что можно добавить в инвентарь: те же списки «Мои» и «Каталог», что на странице
// предметов, — сгруппированные варианты для поиска и сами предметы по id.
export function useAddCandidates() {
  const { user } = useAuth();
  const mine = useItemList('mine');
  const catalog = useItemList('catalog');

  const candidates = useMemo(
    () =>
      mine.items && catalog.items && user
        ? inventoryCandidates(mine.items, catalog.items, user.id)
        : null,
    [mine.items, catalog.items, user],
  );

  const byId = useMemo(
    () =>
      new Map<string, Item>(
        [...(candidates?.mine ?? []), ...(candidates?.others ?? [])].map(
          (item) => [item.id, item],
        ),
      ),
    [candidates],
  );

  const options = useMemo(
    () =>
      candidates
        ? [
            {
              group: 'Мои предметы',
              items: candidates.mine.map(({ id, name }) => ({
                value: id,
                label: name,
              })),
            },
            {
              group: 'Каталог',
              items: candidates.others.map(({ id, name, authorNickname }) => ({
                value: id,
                label: `${name} · ${authorNickname}`,
              })),
            },
          ].filter((group) => group.items.length > 0)
        : [],
    [candidates],
  );

  return {
    loaded: candidates !== null,
    options,
    byId,
    error: mine.error ?? catalog.error,
  };
}
