import { useSearchParams } from 'react-router-dom';
import type { CatalogListScope } from 'shared';

// Вкладка «Мои» / «Каталог» — в адресе (?tab=catalog), чтобы «Назад» с карточки
// возвращал тот же список. Смена вкладки — новая запись в истории; остальные параметры
// (фильтры) при переключении остаются.
export function useCatalogScope() {
  const [params, setParams] = useSearchParams();
  const scope: CatalogListScope =
    params.get('tab') === 'catalog' ? 'catalog' : 'mine';
  const setScope = (next: CatalogListScope) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'catalog') nextParams.set('tab', 'catalog');
    else nextParams.delete('tab');
    setParams(nextParams);
  };
  return [scope, setScope] as const;
}
