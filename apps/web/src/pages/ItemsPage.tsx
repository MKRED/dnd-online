import {
  Alert,
  Button,
  Container,
  Group,
  Loader,
  SegmentedControl,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { ItemListScope } from 'shared';
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
  type ItemCollectionView,
  type ItemFilterValues as Filters,
} from '../features/items';
import { usePageTitle } from '../lib/usePageTitle';

const VIEW_STORAGE_KEY = 'items.view';

// Сетка или список — личная привычка, запоминаем в браузере. Хранилище может быть
// недоступно (приватный режим) — тогда просто сетка.
function readView(): ItemCollectionView {
  try {
    return localStorage.getItem(VIEW_STORAGE_KEY) === 'list' ? 'list' : 'grid';
  } catch (err: unknown) {
    console.error('Failed to read items view', err);
    return 'grid';
  }
}

function saveView(view: ItemCollectionView) {
  try {
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  } catch (err: unknown) {
    console.error('Failed to remember items view', err);
  }
}

const EMPTY_TEXT: Record<ItemListScope, string> = {
  mine: 'У вас пока нет предметов. Создайте первый — например, верёвку или зелье.',
  catalog:
    'В каталоге пока пусто. Опубликуйте свой предмет, чтобы его увидели другие.',
};

function ItemsPage() {
  usePageTitle('Предметы');
  // Вкладка и фильтры — в адресе: «Назад» с карточки предмета возвращает тот же список.
  const [params, setParams] = useSearchParams();
  const scope: ItemListScope =
    params.get('tab') === 'catalog' ? 'catalog' : 'mine';
  const filters = readItemFilters(params);
  const [view, setView] = useState(readView);
  const { items, error } = useItemList(scope);

  // Фильтры меняют адрес без новой записи в истории: «Назад» уводит со страницы, а не
  // перебирает каждую нажатую букву поиска.
  const setFilters = (next: Filters) =>
    setParams(writeItemFilters(params, next), { replace: true });
  // Вкладка — новая запись в истории; фильтры при переключении остаются.
  const setScope = (next: string) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'catalog') nextParams.set('tab', 'catalog');
    else nextParams.delete('tab');
    setParams(nextParams);
  };
  const visible = items && sortItems(filterItems(items, filters), filters.sort);

  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" align="center" mb="md">
        <Title order={1}>Предметы</Title>
        <Button component={Link} to="/items/new">
          Создать предмет
        </Button>
      </Group>
      <Group justify="space-between" mb="lg" gap="sm">
        <SegmentedControl
          aria-label="Какие предметы показать"
          value={scope}
          onChange={setScope}
          data={[
            { value: 'mine', label: 'Мои' },
            { value: 'catalog', label: 'Каталог' },
          ]}
        />
        <SegmentedControl
          aria-label="Вид"
          size="xs"
          value={view}
          onChange={(value) => {
            const next = value === 'list' ? 'list' : 'grid';
            setView(next);
            saveView(next);
          }}
          data={[
            { value: 'grid', label: 'Сетка' },
            { value: 'list', label: 'Список' },
          ]}
        />
      </Group>

      {error ? (
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      ) : !items || !visible ? (
        <Loader />
      ) : items.length === 0 ? (
        // Фильтровать нечего — панель фильтров не показываем.
        <Text c="dimmed">{EMPTY_TEXT[scope]}</Text>
      ) : (
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
    </Container>
  );
}

export default ItemsPage;
