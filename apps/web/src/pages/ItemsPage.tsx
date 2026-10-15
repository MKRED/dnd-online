import { Button, Stack, Text } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import {
  CatalogListLayout,
  useCatalogScope,
  useCollectionView,
} from '../features/catalog';
import {
  countByCategory,
  DEFAULT_ITEM_FILTERS,
  filterItems,
  ItemCollection,
  ItemFilters,
  readItemFilters,
  sortItems,
  useItemList,
  writeItemFilters,
  type ItemFilterValues as Filters,
} from '../features/items';
import { usePageTitle } from '../lib/usePageTitle';

const EMPTY_TEXT = {
  mine: 'У вас пока нет предметов. Создайте первый — например, верёвку или зелье.',
  catalog:
    'В каталоге пока пусто. Опубликуйте свой предмет, чтобы его увидели другие.',
};

function ItemsPage() {
  usePageTitle('Предметы');
  // Вкладка и фильтры — в адресе: «Назад» с карточки предмета возвращает тот же список.
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useCatalogScope();
  const filters = readItemFilters(params);
  const [view, setView] = useCollectionView();
  const { items, error } = useItemList(scope);

  // Фильтры меняют адрес без новой записи в истории: «Назад» уводит со страницы, а не
  // перебирает каждую нажатую букву поиска.
  const setFilters = (next: Filters) =>
    setParams(writeItemFilters(params, next), { replace: true });
  const visible = items && sortItems(filterItems(items, filters), filters.sort);

  return (
    <CatalogListLayout
      section="items"
      createTo="/items/new"
      createLabel="Создать предмет"
      scope={scope}
      onScopeChange={setScope}
      view={view}
      onViewChange={setView}
      error={error}
      loading={!items || !visible}
      // Фильтровать нечего — панель фильтров не показываем.
      empty={items?.length === 0}
      emptyText={EMPTY_TEXT}
    >
      {items && visible && (
        <>
          <ItemFilters
            filters={filters}
            counts={countByCategory(items, filters)}
            onChange={setFilters}
          />
          {visible.length > 0 ? (
            <ItemCollection items={visible} view={view} scope={scope} />
          ) : (
            <Stack align="flex-start" gap="sm">
              <Text c="dimmed">Под фильтры ничего не подошло.</Text>
              <Button
                variant="default"
                onClick={() =>
                  setFilters({ ...DEFAULT_ITEM_FILTERS, sort: filters.sort })
                }
              >
                Сбросить фильтры
              </Button>
            </Stack>
          )}
        </>
      )}
    </CatalogListLayout>
  );
}

export default ItemsPage;
