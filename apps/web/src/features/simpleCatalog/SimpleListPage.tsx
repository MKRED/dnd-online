import { Button, Select, Stack, Text } from '@mantine/core';
import { formatEffectDurationShort } from 'shared';
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
  const filters = readSimpleFilters(params, def.categories);
  const { entries, error } = useCatalogList(
    def.api.list,
    scope,
    def.texts.listFailed,
  );
  // Без новой записи в истории: «Назад» уводит со страницы, а не перебирает буквы поиска.
  const setFilters = (next: SimpleFilters) =>
    setParams(writeSimpleFilters(params, next), { replace: true });
  const visible = entries && applySimpleFilters(entries, filters);

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
            {def.categories.length > 1 && entries && (
              <CategoryChips
                def={def}
                entries={entries}
                value={filters.categories}
                onChange={(categories) =>
                  setFilters({ ...filters, categories })
                }
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
              // Длительность — в колонке списка, как вес у предметов.
              numbers={(entry) =>
                'duration' in entry
                  ? { primary: formatEffectDurationShort(entry.duration) }
                  : undefined
              }
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
