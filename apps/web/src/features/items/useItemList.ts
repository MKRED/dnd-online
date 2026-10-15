import type { CatalogListScope, Item } from 'shared';
import { useCatalogList } from '../catalog';
import { listItems } from './itemsApi';

// Список предметов вкладки. items === null — ещё грузится (или ошибка).
export function useItemList(scope: CatalogListScope) {
  const { entries, error } = useCatalogList<Item>(
    listItems,
    scope,
    'Не удалось загрузить предметы',
  );
  return { items: entries, error };
}
