import type { Item } from 'shared';
import { useCatalogEntry } from '../catalog';
import { getItem } from './itemsApi';

const TEXTS = {
  notFound: 'Предмет не найден',
  failed: 'Не удалось загрузить предмет',
};

// Предмет для страниц просмотра и правки.
export function useItem(id: string) {
  const { entry, error } = useCatalogEntry<Item>(getItem, id, TEXTS);
  return { item: entry, error };
}
