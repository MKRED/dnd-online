import { Badge, Box, Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { PackEntry } from 'shared';
import ItemThumb from '../ItemThumb';

interface PackEntryLineProps {
  entry: Pick<PackEntry, 'itemId' | 'item'>;
  // Название — ссылка на карточку предмета (на карточке набора) или просто текст (в форме).
  renderName?: (name: string) => ReactNode;
  // Пометка «Скрыт» у своего скрытого предмета — в форме, где автор решает о публикации.
  showHidden?: boolean;
  // Справа: количество — в карточке текстом, в форме полем.
  children: ReactNode;
}

// Строка состава набора: миниатюра, название, справа — количество. Предмет, скрытый
// автором от читателя, — серая строка без названия и ссылки.
function PackEntryLine({
  entry,
  renderName = (name) => name,
  showHidden = false,
  children,
}: PackEntryLineProps) {
  const { item } = entry;
  return (
    <Group gap="sm" wrap="nowrap">
      <Box w={36} style={{ flexShrink: 0 }}>
        <ItemThumb
          item={{
            id: entry.itemId,
            name: item?.name ?? '?',
            image: item?.image ?? null,
          }}
          placeholderSize="1rem"
        />
      </Box>
      <Group gap={6} wrap="nowrap" style={{ flex: 1, minWidth: 0 }}>
        {item ? (
          <Text size="sm" truncate>
            {renderName(item.name)}
          </Text>
        ) : (
          <Text size="sm" c="dimmed" fs="italic" truncate>
            Предмет скрыт автором
          </Text>
        )}
        {showHidden && item && !item.isPublic && (
          <Badge
            size="xs"
            variant="outline"
            color="gray"
            style={{ flexShrink: 0 }}
          >
            Скрыт
          </Badge>
        )}
      </Group>
      {children}
    </Group>
  );
}

export default PackEntryLine;
