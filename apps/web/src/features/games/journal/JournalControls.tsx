import { Button, Chip, Group, Switch } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import { GAME_EVENT_GROUP_LABELS, GAME_EVENT_GROUPS } from 'shared';
import type { JournalFilter } from './journalFilter';

interface JournalControlsProps {
  filter: JournalFilter;
  onFilter: (filter: JournalFilter) => void;
  players: boolean;
  onPlayers: (players: boolean) => void;
  loading: boolean;
  onRefresh: () => void;
}

// Над журналом: фильтр по группам записей, «Глазами игроков» и «Обновить» — на случай
// обрыва связи (журнал после первой партии, 2026-10-26, вид А).
function JournalControls({
  filter,
  onFilter,
  players,
  onPlayers,
  loading,
  onRefresh,
}: JournalControlsProps) {
  return (
    <>
      <Chip.Group value={filter} onChange={onFilter}>
        <Group gap={6} mb="xs">
          <Chip value="all" size="xs">
            Все
          </Chip>
          {GAME_EVENT_GROUPS.map((group) => (
            <Chip key={group} value={group} size="xs">
              {GAME_EVENT_GROUP_LABELS[group]}
            </Chip>
          ))}
        </Group>
      </Chip.Group>
      <Group justify="space-between" mb="xs">
        <Switch
          size="xs"
          label="Глазами игроков"
          description="Только то, что увидят игроки"
          checked={players}
          onChange={(event) => onPlayers(event.currentTarget.checked)}
        />
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          loading={loading}
          onClick={onRefresh}
        >
          Обновить
        </Button>
      </Group>
    </>
  );
}

export default JournalControls;
