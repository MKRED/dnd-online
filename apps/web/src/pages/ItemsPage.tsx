import {
  Alert,
  Button,
  Container,
  Group,
  Loader,
  SegmentedControl,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { Item, ItemListScope } from 'shared';
import {
  ItemCollection,
  listItems,
  type ItemCollectionView,
} from '../features/items';
import { errorMessage } from '../lib/apiRequest';
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
  // Вкладка — в адресе: «Назад» с карточки предмета возвращает на ту же вкладку.
  const [params, setParams] = useSearchParams();
  const scope: ItemListScope =
    params.get('tab') === 'catalog' ? 'catalog' : 'mine';
  const [view, setView] = useState(readView);
  // Список помечен вкладкой, для которой загружен: при переключении старый не мелькает,
  // и сбрасывать состояние в эффекте не нужно.
  const [loaded, setLoaded] = useState<{
    scope: ItemListScope;
    items: Item[] | null;
    error: string | null;
  } | null>(null);
  const current = loaded?.scope === scope ? loaded : null;
  const items = current?.items ?? null;
  const error = current?.error ?? null;

  useEffect(() => {
    let active = true;
    listItems(scope)
      .then((list) => {
        if (active) setLoaded({ scope, items: list, error: null });
      })
      .catch((err: unknown) => {
        console.error('Failed to load items', err);
        const message = errorMessage(err, 'Не удалось загрузить предметы');
        if (active) setLoaded({ scope, items: null, error: message });
      });
    return () => {
      active = false;
    };
  }, [scope]);

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
          onChange={(value) =>
            setParams(value === 'catalog' ? { tab: 'catalog' } : {})
          }
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
      ) : !items ? (
        <Loader />
      ) : items.length === 0 ? (
        <Text c="dimmed">{EMPTY_TEXT[scope]}</Text>
      ) : (
        <ItemCollection items={items} view={view} scope={scope} />
      )}
    </Container>
  );
}

export default ItemsPage;
