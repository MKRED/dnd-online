import { Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';

// Строка сведений на карточке записи: подпись слева, значение справа.
function DetailsField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Group gap="xs" wrap="nowrap" align="baseline">
      <Text c="dimmed" size="sm" w={88} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text size="sm">{children}</Text>
    </Group>
  );
}

export default DetailsField;
