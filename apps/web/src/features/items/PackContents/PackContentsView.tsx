import { Anchor, Stack, Text } from '@mantine/core';
import { Link } from 'react-router-dom';
import type { PackEntry } from 'shared';
import PackEntryLine from './PackEntryLine';

// Раздел «Состав» на карточке набора. Каждая видимая строка ведёт на карточку предмета.
function PackContentsView({ contents }: { contents: PackEntry[] }) {
  return (
    <Stack gap="xs">
      <Text fw={600}>Состав</Text>
      {contents.length === 0 ? (
        // Бывает, когда авторы удалили все предметы набора.
        <Text size="sm" c="dimmed">
          Состав пуст: предметы из него удалены
        </Text>
      ) : (
        contents.map((entry) => (
          <PackEntryLine
            key={entry.itemId}
            entry={entry}
            renderName={(name) => (
              <Anchor component={Link} to={`/items/${entry.itemId}`} inherit>
                {name}
              </Anchor>
            )}
          >
            <Text size="sm" c="dimmed" style={{ flexShrink: 0 }}>
              ×{entry.quantity}
            </Text>
          </PackEntryLine>
        ))
      )}
    </Stack>
  );
}

export default PackContentsView;
