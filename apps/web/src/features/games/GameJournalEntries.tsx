import {
  Accordion,
  Alert,
  Button,
  Center,
  Divider,
  Group,
  Loader,
  Text,
} from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import type { GameEvent } from 'shared';
import GameEventItem from './GameEventItem';
import { gameEventTime } from './gameEventText';
import { useGameJournal } from './useGameJournal';

interface GameJournalEntriesProps {
  gameId: string;
  // Записи, пришедшие по сокету, старые первыми.
  live: GameEvent[];
  // Запись «Новый раунд» — разделитель между раундами, а не строка (страница сцены,
  // docs/plan/scene-page.md, этап 7): в бою мастер ищет, что было в этом раунде.
  rounds?: boolean;
}

// Записи журнала игры, новые сверху: в шторке лобби и во вкладке «Журнал» на сцене.
// «Обновить» — на случай обрыва связи, «Показать ещё» — старые страницы.
function GameJournalEntries({ gameId, live, rounds }: GameJournalEntriesProps) {
  const { events, hasMore, loading, loadingMore, error, refresh, loadMore } =
    useGameJournal(gameId, live);
  return (
    <>
      <Group justify="space-between" mb="xs">
        <Text size="sm" c="dimmed">
          Новые записи сверху
        </Text>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconRefresh size={14} />}
          loading={loading}
          onClick={refresh}
        >
          Обновить
        </Button>
      </Group>

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

      <Accordion multiple chevronPosition="right">
        {events.map((event) =>
          rounds && event.kind === 'figures.round' ? (
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
                  Новый раунд · {gameEventTime(event.createdAt)}
                </Text>
              }
            />
          ) : (
            <GameEventItem key={event.seq} event={event} />
          ),
        )}
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
