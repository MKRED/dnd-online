import {
  Accordion,
  Alert,
  Button,
  Center,
  Drawer,
  Group,
  Loader,
  Text,
} from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { IconRefresh } from '@tabler/icons-react';
import type { GameEvent } from 'shared';
import GameEventItem from './GameEventItem';
import { useGameJournal } from './useGameJournal';

interface GameJournalProps {
  gameId: string;
  // Записи, пришедшие по сокету, старые первыми.
  live: GameEvent[];
  opened: boolean;
  onClose: () => void;
}

// Журнал игры у мастера — шторка справа: так же откроется и поверх 3D-сцены, не уводя с
// неё (docs/plan/game.md, этап 2). Новые записи приходят по сокету; «Обновить» — на
// случай обрыва связи.
function GameJournal({ gameId, live, opened, onClose }: GameJournalProps) {
  const narrow = useMediaQuery('(max-width: 36em)');
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={narrow ? '100%' : 'md'}
      title="Журнал игры"
      closeButtonProps={{ 'aria-label': 'Закрыть журнал' }}
    >
      {/* Закрытая шторка не держит содержимое: открытие монтирует его и грузит заново. */}
      <JournalEntries gameId={gameId} live={live} />
    </Drawer>
  );
}

function JournalEntries({
  gameId,
  live,
}: {
  gameId: string;
  live: GameEvent[];
}) {
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
        {events.map((event) => (
          <GameEventItem key={event.seq} event={event} />
        ))}
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

export default GameJournal;
