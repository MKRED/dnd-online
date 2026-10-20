import { Anchor, Group, Stack, Text } from '@mantine/core';
import type { GameLibraryEntry, GameLibraryRef } from 'shared';
import { libraryLinkGroups } from './libraryLinkGroups';

interface LibraryLinksProps {
  entry: GameLibraryEntry;
  onOpen: (ref: GameLibraryRef) => void;
}

// Связи копии по группам; связь из библиотеки открывается своей карточкой.
function LibraryLinks({ entry, onOpen }: LibraryLinksProps) {
  return libraryLinkGroups(entry).map((group) => (
    <Stack key={group.title} gap={4}>
      <Text size="sm" fw={600}>
        {group.title}
      </Text>
      {group.links.map((link) => {
        const { sourceId } = link;
        return (
          <Group key={link.key} gap={6} wrap="nowrap">
            {sourceId && link.name ? (
              <Anchor
                component="button"
                type="button"
                size="sm"
                ta="left"
                style={{ overflowWrap: 'anywhere' }}
                onClick={() => onOpen({ kind: link.kind, sourceId })}
              >
                {link.name}
              </Anchor>
            ) : (
              <Text size="sm" c="dimmed">
                Скрыто или удалено
              </Text>
            )}
            {link.note && (
              <Text size="sm" c="dimmed">
                {link.note}
              </Text>
            )}
          </Group>
        );
      })}
    </Stack>
  ));
}

export default LibraryLinks;
