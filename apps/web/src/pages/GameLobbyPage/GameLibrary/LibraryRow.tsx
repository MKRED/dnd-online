import { Badge, Box, Button, Group, Text, UnstyledButton } from '@mantine/core';
import type { GameLibraryItem } from 'shared';
import { CatalogThumb } from '../../../features/catalog';
import {
  LIBRARY_SOURCE_LABELS,
  libraryImagePath,
  libraryKindLine,
} from '../../../features/games';

interface LibraryRowProps {
  gameId: string;
  entry: GameLibraryItem;
  refreshing: boolean;
  disabled: boolean;
  onOpen: () => void;
  onRefresh: () => void;
}

// Строка библиотеки: миниатюра, название, вид и сверка со справочником. «Обновить» —
// только у изменённой в справочнике копии: у совпадающей обновлять нечего, удалённую или
// скрытую не обновить.
function LibraryRow({
  gameId,
  entry,
  refreshing,
  disabled,
  onOpen,
  onRefresh,
}: LibraryRowProps) {
  return (
    <Group gap="sm" wrap="nowrap" align="center">
      <UnstyledButton
        onClick={onOpen}
        style={{ flex: 1, minWidth: 0 }}
        aria-label={`Открыть: ${entry.name}`}
      >
        <Group gap="sm" wrap="nowrap">
          <Box w={40} style={{ flexShrink: 0 }}>
            <CatalogThumb
              entry={{
                id: entry.sourceId,
                name: entry.name,
                image: entry.image,
              }}
              imagePath={libraryImagePath(gameId, entry.kind)}
              placeholderSize="1rem"
            />
          </Box>
          <Box style={{ minWidth: 0 }}>
            <Text size="sm" fw={500} truncate>
              {entry.name}
            </Text>
            <Group gap={6}>
              <Text size="xs" c="dimmed">
                {libraryKindLine(entry.kind, entry.category)}
              </Text>
              {entry.source !== 'same' && (
                <Badge
                  size="xs"
                  variant="light"
                  color={entry.source === 'changed' ? 'yellow' : 'gray'}
                >
                  {LIBRARY_SOURCE_LABELS[entry.source]}
                </Badge>
              )}
            </Group>
          </Box>
        </Group>
      </UnstyledButton>
      {entry.source === 'changed' && (
        <Button
          size="xs"
          variant="light"
          loading={refreshing}
          disabled={disabled}
          onClick={onRefresh}
        >
          Обновить
        </Button>
      )}
    </Group>
  );
}

export default LibraryRow;
