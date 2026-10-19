import { Badge, Button, Group, Select, Stack, Text } from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import { MONSTER_TYPE_LABELS, MONSTER_TYPES, type Monster } from 'shared';
import { usePageTitle } from '../../../lib/usePageTitle';
import {
  CatalogCollection,
  CatalogListLayout,
  SearchField,
  useCatalogList,
  useCatalogScope,
  useCollectionView,
} from '../../catalog';
import { CategoryChips } from '../../simpleCatalog';
import { monstersApi } from '../monstersApi';
import ChallengeRange from './ChallengeRange';
import {
  applyMonsterFilters,
  DEFAULT_MONSTER_FILTERS,
  readMonsterFilters,
  writeMonsterFilters,
  type MonsterFilters,
} from './monsterFilters';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Сначала новые' },
  { value: 'name', label: 'По названию' },
];

// Чипы типов — как категории у способностей.
const TYPE_KINDS = {
  values: MONSTER_TYPES,
  labels: MONSTER_TYPE_LABELS,
  of: (monster: Monster) => [monster.category],
};

const EMPTY_TEXT = {
  mine: 'У вас пока нет монстров. Создайте первого — например, перепишите его из книги.',
  catalog:
    'В каталоге пока пусто. Опубликуйте своего монстра, чтобы его увидели другие.',
};

function MonsterBadges({
  monster,
  showHidden,
}: {
  monster: Monster;
  showHidden: boolean;
}) {
  return (
    <Group gap={4}>
      <Badge size="xs" variant="light" color="gray">
        {MONSTER_TYPE_LABELS[monster.category]}
      </Badge>
      {monster.role === 'unique' && (
        <Badge size="xs" variant="light" color="grape">
          Уникальный
        </Badge>
      )}
      {showHidden && !monster.isPublic && (
        <Badge size="xs" variant="outline" color="gray">
          Скрыт
        </Badge>
      )}
    </Group>
  );
}

// Раздел справочника «Монстры»: «Мои» и «Каталог», поиск, типы и ПО в адресе, сетка или
// список.
function MonsterListPage() {
  usePageTitle('Монстры');
  const [params, setParams] = useSearchParams();
  const [scope, setScope] = useCatalogScope();
  const [view, setView] = useCollectionView();
  const filters = readMonsterFilters(params);
  const { entries, error } = useCatalogList(
    monstersApi.list,
    scope,
    'Не удалось загрузить монстров',
  );
  // Без новой записи в истории: «Назад» уводит со страницы, а не перебирает буквы поиска.
  const setFilters = (next: MonsterFilters) =>
    setParams(writeMonsterFilters(params, next), { replace: true });
  const visible = entries && applyMonsterFilters(entries, filters);

  return (
    <CatalogListLayout
      section="monsters"
      createTo="/monsters/new"
      createLabel="Создать монстра"
      scope={scope}
      onScopeChange={setScope}
      view={view}
      onViewChange={setView}
      error={error}
      loading={!visible}
      empty={entries?.length === 0}
      emptyText={EMPTY_TEXT}
    >
      {visible && entries && (
        <>
          <Stack gap="sm" mb="lg">
            <SearchField
              value={filters.query}
              onChange={(query) => setFilters({ ...filters, query })}
            />
            <CategoryChips
              kinds={TYPE_KINDS}
              hideEmpty
              entries={entries}
              value={filters.types}
              onChange={(types) =>
                setFilters({
                  ...filters,
                  types: types as MonsterFilters['types'],
                })
              }
            />
            <Group gap="sm">
              <ChallengeRange
                min={filters.crMin}
                max={filters.crMax}
                onChange={(crMin, crMax) =>
                  setFilters({ ...filters, crMin, crMax })
                }
              />
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
            </Group>
          </Stack>
          {visible.length > 0 ? (
            <CatalogCollection
              entries={visible}
              view={view}
              scope={scope}
              basePath="/monsters"
              imagePath={monstersApi.imagePath}
              numbers={(monster) => ({
                primary: `ПО ${monster.statBlock.challenge}`,
              })}
              badges={(monster) => (
                <MonsterBadges
                  monster={monster}
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
                  setFilters({ ...DEFAULT_MONSTER_FILTERS, sort: filters.sort })
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

export default MonsterListPage;
