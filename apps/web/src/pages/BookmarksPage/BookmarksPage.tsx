import {
  Alert,
  Chip,
  Container,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useSearchParams } from 'react-router-dom';
import { BOOKMARK_KINDS, type Bookmark } from 'shared';
import { useAuth } from '../../features/auth';
import {
  BOOKMARK_KIND_LABELS,
  BookmarkRow,
  countBookmarks,
  filterBookmarks,
  readBookmarkFilters,
  useBookmarks,
  writeBookmarkFilters,
  type BookmarkFilters,
} from '../../features/bookmarks';
import { SearchField } from '../../features/catalog';
import { usePageTitle } from '../../lib/usePageTitle';
import { bookmarkTargetView } from './bookmarkTargetView';

// Закладки игрока (docs/plan/done/bookmarks.md): чипы по виду, поиск, разделы по виду.
function BookmarksPage() {
  usePageTitle('Закладки');
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filters = readBookmarkFilters(params);
  // Набор в поиске — без новой записи в истории, как в каталоге.
  const setFilters = (next: BookmarkFilters) =>
    setParams(writeBookmarkFilters(next), { replace: true });
  const { bookmarks, error, removing, removeError, remove } = useBookmarks();

  if (error) {
    return (
      <Container size="md" py="xl">
        <Title order={1} mb="lg">
          Закладки
        </Title>
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      </Container>
    );
  }

  const counts = bookmarks && countBookmarks(bookmarks);
  const shown = bookmarks ? filterBookmarks(bookmarks, filters) : [];
  const sections = BOOKMARK_KINDS.map((kind) => ({
    kind,
    list: shown.filter((bookmark) => bookmark.kind === kind),
  })).filter((section) => section.list.length > 0);

  const row = (bookmark: Bookmark) => {
    const { to, thumb } = bookmarkTargetView(bookmark);
    return (
      <BookmarkRow
        key={`${bookmark.kind}/${bookmark.targetId}`}
        target={bookmark.target}
        to={to}
        thumb={thumb}
        isMine={bookmark.target?.authorId === user?.id}
        removing={removing === bookmark.targetId}
        onRemove={() => remove(bookmark.kind, bookmark.targetId)}
      />
    );
  };

  return (
    <Container size="md" py="xl">
      <Title order={1} mb="lg">
        Закладки
      </Title>
      {!bookmarks || !counts ? (
        <Loader />
      ) : bookmarks.length === 0 ? (
        <Text c="dimmed">
          Пока нет закладок. Отметьте звёздочкой персонажа или запись
          справочника.
        </Text>
      ) : (
        <Stack gap="lg">
          <Stack gap="sm">
            <Chip.Group
              value={filters.kind ?? 'all'}
              onChange={(value) =>
                setFilters({
                  ...filters,
                  kind: BOOKMARK_KINDS.find((kind) => kind === value) ?? null,
                })
              }
            >
              <Group gap={6} role="group" aria-label="Вид закладок">
                <Chip value="all" size="sm">
                  Все
                </Chip>
                {BOOKMARK_KINDS.map((kind) => (
                  <Chip key={kind} value={kind} size="sm">
                    {BOOKMARK_KIND_LABELS[kind]}{' '}
                    {/* Цвет надписи, а не dimmed: на закрашенном выбранном чипе серый не виден. */}
                    <Text span size="xs" c="inherit" opacity={0.7}>
                      {counts[kind]}
                    </Text>
                  </Chip>
                ))}
              </Group>
            </Chip.Group>
            <SearchField
              value={filters.query}
              onChange={(query) => setFilters({ ...filters, query })}
            />
          </Stack>
          {removeError && (
            <Alert color="red" title="Ошибка">
              {removeError}
            </Alert>
          )}
          {sections.length === 0 ? (
            <Text c="dimmed">Ничего не нашлось</Text>
          ) : (
            sections.map(({ kind, list }) => (
              <Stack key={kind} gap="sm">
                <Title order={2} size="h4">
                  {BOOKMARK_KIND_LABELS[kind]}
                </Title>
                {list.map(row)}
              </Stack>
            ))
          )}
        </Stack>
      )}
    </Container>
  );
}

export default BookmarksPage;
