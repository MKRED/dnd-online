import { useState } from 'react';
import type { CatalogCollectionView } from './CatalogCollection';

// Ключ остался от страницы предметов: так выбор, сделанный там, работает и в других
// разделах справочника.
const VIEW_STORAGE_KEY = 'items.view';

// Сетка или список — личная привычка, одна на весь справочник, запоминаем в браузере.
// Хранилище может быть недоступно (приватный режим) — тогда просто сетка.
function readView(): CatalogCollectionView {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch (err: unknown) {
    console.error('Failed to read catalog view', err);
    return 'grid';
  }
}

function saveView(view: CatalogCollectionView) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (err: unknown) {
    console.error('Failed to remember catalog view', err);
  }
}

export function useCollectionView() {
  const [view, setView] = useState(readView);
  const change = (next: CatalogCollectionView) => {
    setView(next);
    saveView(next);
  };
  return [view, change] as const;
}
