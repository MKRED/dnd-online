import { ActionIcon, Stack, Text, Tooltip } from '@mantine/core';
import type { BookmarkKind } from 'shared';
import { useBookmark } from './useBookmark';

interface BookmarkButtonProps {
  kind: BookmarkKind;
  id: string;
}

// Контур и заливка звезды; иконочной библиотеки в проекте нет.
const STAR =
  'M12 2.5l2.94 5.96 6.56.95-4.75 4.63 1.12 6.54L12 17.5l-5.87 3.08 1.12-6.54L2.5 9.41l6.56-.95L12 2.5z';

// Звёздочка закладки у названия на странице просмотра (docs/plan/done/bookmarks.md).
function BookmarkButton({ kind, id }: BookmarkButtonProps) {
  const { bookmarked, busy, error, toggle } = useBookmark(kind, id);
  const label = bookmarked ? 'Убрать из закладок' : 'Добавить в закладки';

  return (
    <Stack gap={2} align="center" style={{ flexShrink: 0 }}>
      <Tooltip label={label}>
        <ActionIcon
          variant="subtle"
          color={bookmarked ? 'yellow' : 'gray'}
          size="xl"
          aria-label={label}
          aria-pressed={bookmarked ?? false}
          loading={busy}
          disabled={bookmarked === null}
          onClick={toggle}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            width="26"
            height="26"
            fill={bookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d={STAR} />
          </svg>
        </ActionIcon>
      </Tooltip>
      {error && (
        <Text size="xs" c="red" maw={160} ta="center" role="alert">
          {error}
        </Text>
      )}
    </Stack>
  );
}

export default BookmarkButton;
