import { useState } from 'react';
import type { CatalogCollectionView } from './CatalogCollection';

// Ключ остался от страницы предметов: так выбор, сделанный там, работает и в других
// разделах справочника.
const CATALOG_VIEW_KEY = 'items.view';

// Сетка или список — личная привычка, одна на весь справочник, запоминаем в браузере.
// Свой ключ — у списков вне справочника («Мои карты»).
// Хранилище может быть недоступно (приватный режим) — тогда вид по умолчанию.
function readView(
  key: string,
  fallback: CatalogCollectionView,
): CatalogCollectionView {
  try {
    const stored = localStorage.getItem(key);
    return stored === 'list' || stored === 'grid' ? stored : fallback;
  } catch (err: unknown) {
    console.error('Failed to read catalog view', err);
    return fallback;
  }
}

function saveView(key: string, view: CatalogCollectionView) {
  try {
    localStorage.setItem(key, view);
  } catch (err: unknown) {
    console.error('Failed to remember catalog view', err);
  }
}

export function useCollectionView(
  key = CATALOG_VIEW_KEY,
  fallback: CatalogCollectionView = 'grid',
) {
  const [view, setView] = useState(() => readView(key, fallback));
  const change = (next: CatalogCollectionView) => {
    setView(next);
    saveView(key, next);
  };
  return [view, change] as const;
}
