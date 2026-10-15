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
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CatalogListScope } from 'shared';
import type { CatalogCollectionView } from './CatalogCollection';
import type { CatalogSection } from './catalogSections';
import CatalogNav from './CatalogNav';

interface CatalogListLayoutProps {
  section: CatalogSection;
  createTo: string;
  createLabel: string;
  scope: CatalogListScope;
  onScopeChange: (scope: CatalogListScope) => void;
  view: CatalogCollectionView;
  onViewChange: (view: CatalogCollectionView) => void;
  // Состояние загрузки списка: ошибка, ещё грузится, пустой (тогда emptyText и без
  // фильтров — фильтровать нечего), иначе — children.
  error: string | null;
  loading: boolean;
  empty: boolean;
  emptyText: Record<CatalogListScope, string>;
  children: ReactNode;
}

// Каркас страницы раздела справочника: заголовок, разделы, «Мои» и «Каталог», сетка или
// список. Содержимое (фильтры и коллекцию) передаёт раздел.
function CatalogListLayout({
  section,
  createTo,
  createLabel,
  scope,
  onScopeChange,
  view,
  onViewChange,
  error,
  loading,
  empty,
  emptyText,
  children,
}: CatalogListLayoutProps) {
  return (
    <Container size="lg" py="xl">
      <Group justify="space-between" align="center" mb="sm">
        <Title order={1}>Справочник</Title>
        <Button component={Link} to={createTo}>
          {createLabel}
        </Button>
      </Group>
      <CatalogNav active={section} />
      <Group justify="space-between" mb="lg" gap="sm">
        <SegmentedControl
          aria-label="Чьи записи показать"
          value={scope}
          onChange={(value) =>
            onScopeChange(value === 'catalog' ? 'catalog' : 'mine')
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
          onChange={(value) => onViewChange(value === 'list' ? 'list' : 'grid')}
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
      ) : loading ? (
        <Loader />
      ) : empty ? (
        <Text c="dimmed">{emptyText[scope]}</Text>
      ) : (
        children
      )}
    </Container>
  );
}

export default CatalogListLayout;
