import {
  Accordion,
  Alert,
  Button,
  Center,
  Divider,
  Loader,
  Text,
} from '@mantine/core';
import { useState } from 'react';
import type { GameEvent } from 'shared';
import GameEventItem from './GameEventItem';
import { dividerTitle, gameEventTime } from './gameEventText';
import JournalControls from './JournalControls';
import { filterJournal, type JournalFilter } from './journalFilter';
import { useGameJournal } from './useGameJournal';

interface GameJournalEntriesProps {
  gameId: string;
  // Записи, пришедшие по сокету, старые первыми.
  live: GameEvent[];
  // Записи «Новый раунд», начало и конец боя — разделители, а не строки (страница сцены,
  // docs/plan/done/scene-page.md, этап 7): в бою мастер ищет, что было в этом раунде.
  rounds?: boolean;
}

// Записи журнала игры, новые сверху: в шторке лобби и во вкладке «Журнал» на сцене.
// Фильтр по группам и «Глазами игроков» — по загруженным записям (journalFilter.ts);
// «Показать ещё» — старые страницы.
function GameJournalEntries({ gameId, live, rounds }: GameJournalEntriesProps) {
  const { events, hasMore, loading, loadingMore, error, refresh, loadMore } =
    useGameJournal(gameId, live);
  const [filter, setFilter] = useState<JournalFilter>('all');
  const [players, setPlayers] = useState(false);
  const view = players ? 'players' : 'master';
  const shown = filterJournal(events, { filter, players, rounds: !!rounds });
  const anyEntry = shown.some((event) => !(rounds && dividerTitle(event)));
  return (
    <>
      <JournalControls
        filter={filter}
        onFilter={setFilter}
        players={players}
        onPlayers={setPlayers}
        loading={loading}
        onRefresh={refresh}
      />

      {error && (
        <Alert color="red" mb="xs">
          {error}
        </Alert>
      )}
      {loading && events.length === 0 && (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      )}
      {!loading && !error && events.length === 0 && (
        <Text c="dimmed" size="sm">
          Записей пока нет
        </Text>
      )}
      {events.length > 0 && !anyEntry && (
        <Text c="dimmed" size="sm">
          Среди загруженных записей таких нет
        </Text>
      )}

      <Accordion multiple chevronPosition="right">
        {shown.map((event) => {
          const divider = rounds ? dividerTitle(event) : null;
          return divider ? (
            <Divider
              key={event.seq}
              my="xs"
              labelPosition="left"
              label={
                <Text
                  size="xs"
                  fw={700}
                  tt="uppercase"
                  c="var(--mantine-primary-color-filled)"
                >
                  {divider} · {gameEventTime(event.createdAt)}
                </Text>
              }
            />
          ) : (
            <GameEventItem key={event.seq} event={event} view={view} />
          );
        })}
      </Accordion>

      {hasMore && (
        <Button
          variant="default"
          fullWidth
          mt="md"
          loading={loadingMore}
          onClick={loadMore}
        >
          Показать ещё
        </Button>
      )}
    </>
  );
}

export default GameJournalEntries;
