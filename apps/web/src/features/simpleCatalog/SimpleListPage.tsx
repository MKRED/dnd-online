import { Button, Select, Stack, Text } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import {
  CatalogCollection,
  CatalogListLayout,
  SearchField,
  useCatalogList,
  useCatalogScope,
  useCollectionView,
} from '../catalog';
import { usePageTitle } from '../../lib/usePageTitle';
import CategoryChips from './CategoryChips';
import LevelChips from './LevelChips';
import SimpleBadges from './SimpleBadges';
import type { SimpleCatalogDef } from './simpleCatalogs';
import {
  applySimpleFilters,
  DEFAULT_SIMPLE_FILTERS,
  readSimpleFilters,
  writeSimpleFilters,
  type SimpleFilters,
} from './simpleFilters';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Сначала новые' },
  { value: 'name', label: 'По названию' },
];

interface SimpleListPageProps {
  def: SimpleCatalogDef;
}

// Раздел справочника для способностей или эффектов: «Мои» и «Каталог», поиск и
// сортировка в адресе, сетка или список.
function SimpleListPage({ def }: SimpleListPageProps) {
  usePageTitle(def.texts.title);
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useCatalogScope();
  const [view, setView] = useCollectionView();
  const filters = readSimpleFilters(params, def.kinds.values);
  const { entries, error } = useCatalogList(
    def.api.list,
    scope,
    def.texts.listFailed,
  );
  // Без новой записи в истории: «Назад» уводит со страницы, а не перебирает буквы поиска.
  const setFilters = (next: SimpleFilters) =>
    setParams(writeSimpleFilters(params, next), { replace: true });
  const visible =
    entries && applySimpleFilters(entries, filters, def.kinds.of, def.levelOf);
  // Круги заклинаний среди записей выбранных категорий: выбрали «Базовую» — чипов кругов
  // нет, им нечего отбирать.
  const levels =
    entries && def.levelOf
      ? applySimpleFilters(
          entries,
          { ...DEFAULT_SIMPLE_FILTERS, categories: filters.categories },
          def.kinds.of,
        )
          .map(def.levelOf)
          .filter((level) => level !== null)
      : [];

  return (
    <CatalogListLayout
      section={def.section}
      createTo={`${def.path}/new`}
      createLabel={def.texts.createLabel}
      scope={scope}
      onScopeChange={setScope}
      view={view}
      onViewChange={setView}
      error={error}
      loading={!visible}
      empty={entries?.length === 0}
      emptyText={def.texts.empty}
    >
      {visible && (
        <>
          <Stack gap="sm" mb="lg">
            <SearchField
              value={filters.query}
              onChange={(query) => setFilters({ ...filters, query })}
            />
            {def.kinds.values.length > 1 && entries && (
              <CategoryChips
                def={def}
                entries={entries}
                value={filters.categories}
                onChange={(categories) =>
                  setFilters({ ...filters, categories })
                }
              />
            )}
            {(levels.length > 0 || filters.levels.length > 0) && (
              <LevelChips
                levels={levels}
                value={filters.levels}
                onChange={(next) => setFilters({ ...filters, levels: next })}
              />
            )}
            <Select
              aria-label="Сортировка"
              data={SORT_OPTIONS}
              value={filters.sort}
              allowDeselect={false}
              onChange={(value) =>
                setFilters({
                  ...filters,
                  sort: value === 'name' ? 'name' : 'recent',
                })
              }
              maw={220}
            />
          </Stack>
          {visible.length > 0 ? (
            <CatalogCollection
              entries={visible}
              view={view}
              scope={scope}
              basePath={def.path}
              imagePath={def.api.imagePath}
              // Главное общее поле раздела — в колонке списка, как вес у предметов.
              numbers={(entry) => {
                const value = def.extras.listValue(entry);
                return value === null ? undefined : { primary: value };
              }}
              badges={(entry) => (
                <SimpleBadges
                  def={def}
                  entry={entry}
                  showHidden={scope === 'mine'}
                />
              )}
            />
          ) : (
            <Stack align="flex-start" gap="sm">
              <Text c="dimmed">Под фильтры ничего не подошло.</Text>
              <Button
                variant="default"
                onClick={() =>
                  setFilters({ ...DEFAULT_SIMPLE_FILTERS, sort: filters.sort })
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

export default SimpleListPage;
