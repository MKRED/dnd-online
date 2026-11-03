import { Chip, Group, Stack, Text } from '@mantine/core';
import {
  GAME_LIBRARY_KINDS,
  type GameLibraryItem,
  type GameLibraryKind,
  type GameLibraryRef,
} from 'shared';
import { normalizeSearch, SearchField } from '../../../features/catalog';
import { LIBRARY_KIND_CHIPS } from '../../../features/games';
import ChangedBlock from './ChangedBlock';
import LibraryRow from './LibraryRow';

export interface LibraryFilter {
  kind: GameLibraryKind | 'all';
  search: string;
}

interface LibraryListProps {
  gameId: string;
  entries: GameLibraryItem[];
  filter: LibraryFilter;
  onFilterChange: (filter: LibraryFilter) => void;
  refreshing: string | null;
  onOpen: (ref: GameLibraryRef) => void;
  onRefresh: (ref: GameLibraryRef) => void;
  onRefreshAll: (entries: GameLibraryItem[]) => void;
  onConfirmingChange: (confirming: boolean) => void;
}

// Список копий: чипы по видам (с числом), поиск по названию. Сервер отдаёт их по имени.
// Изменённые в справочнике вынесены в блок над остальными, под тем же фильтром.
function LibraryList({
  gameId,
  entries,
  filter,
  onFilterChange,
  refreshing,
  onOpen,
  onRefresh,
  onRefreshAll,
  onConfirmingChange,
}: LibraryListProps) {
  const count = (kind: GameLibraryKind) =>
    entries.filter((entry) => entry.kind === kind).length;
  const query = normalizeSearch(filter.search);
  const shown = entries.filter(
    (entry) =>
      (filter.kind === 'all' || entry.kind === filter.kind) &&
      normalizeSearch(entry.name).includes(query),
  );
  const changed = shown.filter((entry) => entry.source === 'changed');
  const rest = shown.filter((entry) => entry.source !== 'changed');

  return (
    <Stack gap="sm">
      <Chip.Group
        value={filter.kind}
        onChange={(kind) => onFilterChange({ ...filter, kind })}
      >
        <Group gap={6}>
          <Chip value="all" size="xs">
            Все {entries.length}
          </Chip>
          {GAME_LIBRARY_KINDS.map((kind) => (
            <Chip key={kind} value={kind} size="xs">
              {LIBRARY_KIND_CHIPS[kind]} {count(kind)}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      <SearchField
        value={filter.search}
        onChange={(search) => onFilterChange({ ...filter, search })}
      />
      {shown.length === 0 && (
        <Text c="dimmed" size="sm">
          Ничего не найдено
        </Text>
      )}
      {changed.length > 0 && (
        <ChangedBlock
          gameId={gameId}
          entries={changed}
          refreshing={refreshing}
          onOpen={onOpen}
          onRefresh={onRefresh}
          onRefreshAll={onRefreshAll}
          onConfirmingChange={onConfirmingChange}
        />
      )}
      {changed.length > 0 && rest.length > 0 && (
        <Text size="xs" c="dimmed" tt="uppercase" mt={4}>
          Остальные
        </Text>
      )}
      {rest.map((entry) => (
        <LibraryRow
          key={`${entry.kind}:${entry.sourceId}`}
          gameId={gameId}
          entry={entry}
          refreshing={false}
          disabled={refreshing !== null}
          onOpen={() => onOpen(entry)}
          onRefresh={() => onRefresh(entry)}
        />
      ))}
    </Stack>
  );
}

export default LibraryList;
