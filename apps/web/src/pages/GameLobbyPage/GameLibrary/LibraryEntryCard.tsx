import {
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useEffect, useState } from 'react';
import type { GameLibraryEntry, GameLibraryRef } from 'shared';
import { EntryImage, SourcesList } from '../../../features/catalog';
import {
  gameEventTime,
  getGameLibraryEntry,
  LIBRARY_SOURCE_LABELS,
  libraryImagePath,
  libraryKindLine,
} from '../../../features/games';
import { errorMessage } from '../../../lib/apiRequest';
import LibraryLinks from './LibraryLinks';

interface LibraryEntryCardProps {
  gameId: string;
  entryRef: GameLibraryRef;
  // Растёт, когда библиотеку меняли: карточка перечитывает себя.
  version: number;
  refreshing: boolean;
  onOpen: (ref: GameLibraryRef) => void;
  onRefresh: (ref: GameLibraryRef) => Promise<GameLibraryEntry | null>;
}

// Карточка копии: что лежит в игре, откуда и когда скопировано, сверка со справочником и
// связи. Полные карточки (стат-блок монстра, шаги способности) придут с этапом 8, когда
// игра начнёт их читать.
function LibraryEntryCard({
  gameId,
  entryRef,
  version,
  refreshing,
  onOpen,
  onRefresh,
}: LibraryEntryCardProps) {
  const { kind, sourceId } = entryRef;
  const [entry, setEntry] = useState<GameLibraryEntry | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getGameLibraryEntry(gameId, kind, sourceId)
      .then((loaded) => {
        if (!active) return;
        setEntry(loaded);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        console.error('Failed to load library entry', err);
        setError(errorMessage(err, 'Не удалось загрузить запись'));
      });
    return () => {
      active = false;
    };
  }, [gameId, kind, sourceId, version]);

  if (error) return <Alert color="red">{error}</Alert>;
  // Открыли другую связь — старая карточка не показывается под новым адресом.
  if (!entry || entry.sourceId !== sourceId || entry.kind !== kind)
    return (
      <Center py="xl">
        <Loader size="sm" />
      </Center>
    );

  const { record } = entry;
  return (
    <Stack gap="sm">
      {record.image && (
        <EntryImage entry={record} imagePath={libraryImagePath(gameId, kind)} />
      )}
      <Box>
        <Title order={3} style={{ overflowWrap: 'anywhere' }}>
          {entry.name}
        </Title>
        <Text size="sm" c="dimmed">
          {libraryKindLine(kind, entry.category)} · автор{' '}
          {record.authorNickname}
        </Text>
        <Text size="xs" c="dimmed">
          Скопирована {gameEventTime(entry.copiedAt)}
          {entry.refreshedAt &&
            `, обновлена ${gameEventTime(entry.refreshedAt)}`}
        </Text>
      </Box>

      {entry.source === 'same' ? (
        <Text size="sm" c="dimmed">
          Совпадает со справочником
        </Text>
      ) : (
        <Group gap="xs">
          <Badge
            variant="light"
            color={entry.source === 'changed' ? 'yellow' : 'gray'}
          >
            {LIBRARY_SOURCE_LABELS[entry.source]}
          </Badge>
          {entry.source === 'changed' ? (
            <Button
              size="xs"
              loading={refreshing}
              onClick={() => {
                void onRefresh(entryRef).then((fresh) => {
                  if (fresh) setEntry(fresh);
                });
              }}
            >
              Обновить из справочника
            </Button>
          ) : (
            <Text size="xs" c="dimmed">
              Запись удалена или скрыта от вас — в игре остаётся эта копия.
            </Text>
          )}
        </Group>
      )}

      {record.description && (
        <Text
          size="sm"
          style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
        >
          {record.description}
        </Text>
      )}
      <SourcesList sources={record.sources} />
      <LibraryLinks entry={entry} onOpen={onOpen} />
    </Stack>
  );
}

export default LibraryEntryCard;
