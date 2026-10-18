import { Group } from '@mantine/core';
import type { ReactNode } from 'react';
import type { BookmarkKind } from 'shared';
import BookmarkButton from './BookmarkButton';

interface TitleWithBookmarkProps {
  kind: BookmarkKind;
  id: string;
  // Заголовок страницы как есть: у листа персонажа свой размер шрифта.
  children: ReactNode;
}

// Заголовок страницы просмотра со звёздочкой справа. Длинное название переносится, а
// звезда остаётся у первой строки.
function TitleWithBookmark({ kind, id, children }: TitleWithBookmarkProps) {
  return (
    <Group gap="xs" wrap="nowrap" align="flex-start">
      <div style={{ minWidth: 0 }}>{children}</div>
      <BookmarkButton kind={kind} id={id} />
    </Group>
  );
}

export default TitleWithBookmark;
