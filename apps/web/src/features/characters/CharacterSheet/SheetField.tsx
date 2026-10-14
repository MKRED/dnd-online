import { Group, Text } from '@mantine/core';
import type { ReactNode } from 'react';

interface SheetFieldProps {
  label: string;
  children: ReactNode;
}

// Строка «подпись — значение» листа. Подпись не сжимается, длинное значение переносится.
function SheetField({ label, children }: SheetFieldProps) {
  return (
    <Group gap="xs" wrap="nowrap" align="baseline">
      <Text c="dimmed" size="sm" w={150} style={{ flexShrink: 0 }}>
        {label}
      </Text>
      <Text
        size="sm"
        style={{ overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}
      >
        {children}
      </Text>
    </Group>
  );
}

export default SheetField;
