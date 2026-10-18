import { Anchor, Box, Button, Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { BookmarkTarget } from 'shared';

interface BookmarkRowProps {
  target: BookmarkTarget | null;
  // Ссылка на страницу цели и её миниатюра — их знает страница: у каждого вида свои.
  to: string;
  thumb: ReactNode;
  isMine: boolean;
  removing: boolean;
  onRemove: () => void;
}

// Строка закладки: миниатюра, название и автор. Цель скрыта автором — плашка без
// названия, которую можно только убрать.
function BookmarkRow({
  target,
  to,
  thumb,
  isMine,
  removing,
  onRemove,
}: BookmarkRowProps) {
  if (!target) {
    return (
      <Group gap="sm" wrap="nowrap">
        <Box
          w={40}
          h={40}
          style={{
            flexShrink: 0,
            borderRadius: 'var(--mantine-radius-md)',
            border: '1px dashed var(--mantine-color-default-border)',
          }}
          aria-hidden
        />
        <Text size="sm" c="dimmed" fs="italic" style={{ flex: 1 }}>
          Автор закрыл доступ
        </Text>
        <Button
          size="compact-sm"
          variant="subtle"
          color="gray"
          loading={removing}
          onClick={onRemove}
        >
          Убрать
        </Button>
      </Group>
    );
  }
  return (
    <Group gap="sm" wrap="nowrap">
      <Box w={40} style={{ flexShrink: 0 }}>
        {thumb}
      </Box>
      <Box style={{ flex: 1, minWidth: 0 }}>
        <Anchor component={Link} to={to} display="block" lineClamp={2}>
          {target.name}
        </Anchor>
        <Text size="xs" c="dimmed" truncate>
          {isMine ? 'вы' : target.authorNickname}
        </Text>
      </Box>
    </Group>
  );
}

export default BookmarkRow;
