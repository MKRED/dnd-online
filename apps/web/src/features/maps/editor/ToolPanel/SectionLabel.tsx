import { Group, Kbd, Text } from '@mantine/core';
import type { ReactNode } from 'react';

// Подпись раздела свойств инструмента (макет «П2», docs/plan/done/scene-page.md, этап 3):
// мелкими прописными, справа — клавиша раздела. after — приглушённое уточнение после
// подписи («север», «из первого угла»).
function SectionLabel({
  title,
  hotkey,
  after,
}: {
  title: string;
  hotkey?: string;
  after?: ReactNode;
}) {
  return (
    <Group gap={6} justify="space-between" wrap="nowrap">
      <Text size="xs" fw={600} c="dimmed" tt="uppercase" lts="0.06em">
        {title}
        {after && (
          <Text span size="xs" fw={400} tt="none" lts={0}>
            {' · '}
            {after}
          </Text>
        )}
      </Text>
      {hotkey && <Kbd size="xs">{hotkey}</Kbd>}
    </Group>
  );
}

export default SectionLabel;
