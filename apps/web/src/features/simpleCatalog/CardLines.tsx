import { Stack, Text } from '@mantine/core';

// Значение строки карточки в несколько строк: затраты способности, чувства эффекта.
function CardLines({ lines }: { lines: string[] }) {
  return (
    <Stack gap={2} component="span">
      {lines.map((line) => (
        <Text key={line} size="sm" span display="block">
          {line}
        </Text>
      ))}
    </Stack>
  );
}

export default CardLines;
