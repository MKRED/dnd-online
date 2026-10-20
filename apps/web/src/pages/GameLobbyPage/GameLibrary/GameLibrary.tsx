import { Alert, Anchor, Center, Drawer, Loader, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';
import type { GameLibraryRef } from 'shared';
import LibraryEntryCard from './LibraryEntryCard';
import LibraryList, { type LibraryFilter } from './LibraryList';
import { useGameLibrary } from './useGameLibrary';

interface GameLibraryProps {
  gameId: string;
  // Растёт, когда в игре скопировали или обновили записи.
  version: number;
  opened: boolean;
  onClose: () => void;
}

// Библиотека игры у мастера — шторка справа, как журнал: так же откроется и поверх сцены
// (docs/plan/game.md, этап 4). Список и карточка копии сменяют друг друга внутри шторки.
function GameLibrary({ gameId, version, opened, onClose }: GameLibraryProps) {
  const narrow = useMediaQuery('(max-width: 36em)');
  return (
    <Drawer
      opened={opened}
      onClose={onClose}
      position="right"
      size={narrow ? '100%' : 'md'}
      title="Библиотека игры"
      closeButtonProps={{ 'aria-label': 'Закрыть библиотеку' }}
    >
      {/* Закрытая шторка не держит содержимое: открытие монтирует его и грузит заново. */}
      <LibraryContent gameId={gameId} version={version} />
    </Drawer>
  );
}

function LibraryContent({
  gameId,
  version,
}: {
  gameId: string;
  version: number;
}) {
  const { entries, loading, error, refreshing, refresh } = useGameLibrary(
    gameId,
    version,
  );
  const [filter, setFilter] = useState<LibraryFilter>({
    kind: 'all',
    search: '',
  });
  // Открытые карточки по порядку: из карточки можно перейти к её связи и вернуться.
  const [trail, setTrail] = useState<GameLibraryRef[]>([]);
  const current = trail.at(-1);
  const open = (ref: GameLibraryRef) =>
    setTrail((prev) => [...prev, { kind: ref.kind, sourceId: ref.sourceId }]);

  return (
    <>
      {error && (
        <Alert color="red" mb="sm">
          {error}
        </Alert>
      )}
      {current ? (
        <>
          {/* Ссылкой, как «← Все игры» над лобби: ровно по краю карточки. */}
          <Anchor
            component="button"
            type="button"
            size="sm"
            mb="sm"
            display="block"
            onClick={() => setTrail((prev) => prev.slice(0, -1))}
          >
            {trail.length > 1 ? '← Назад' : '← К библиотеке'}
          </Anchor>
          <LibraryEntryCard
            gameId={gameId}
            entryRef={current}
            version={version}
            refreshing={refreshing === `${current.kind}:${current.sourceId}`}
            onOpen={open}
            onRefresh={refresh}
          />
        </>
      ) : loading && entries.length === 0 ? (
        <Center py="xl">
          <Loader size="sm" />
        </Center>
      ) : entries.length === 0 ? (
        !error && (
          <Text c="dimmed" size="sm">
            Библиотека пуста. В начале встречи сюда скопируются предметы,
            способности и эффекты персонажей на местах, а со сценами — монстры и
            содержимое сундуков.
          </Text>
        )
      ) : (
        <>
          <Text size="sm" c="dimmed" mb="sm">
            Копии записей справочников, которые использует игра: правка
            справочника их не меняет.
          </Text>
          <LibraryList
            gameId={gameId}
            entries={entries}
            filter={filter}
            onFilterChange={setFilter}
            refreshing={refreshing}
            onOpen={open}
            onRefresh={(ref) => void refresh(ref)}
          />
        </>
      )}
    </>
  );
}

export default GameLibrary;
