import { Center, Stack, Text } from '@mantine/core';
import { IconCubeOff } from '@tabler/icons-react';

// Без модели (не выбрана или удалена) — заглушка вместо картинки обстановки.
function NoModel({ size, text }: { size: number; text?: string }) {
  return (
    <Center w={size} h={size} c="dimmed">
      <Stack gap={4} align="center">
        <IconCubeOff size={Math.min(48, size * 0.6)} stroke={1.2} />
        {text && (
          <Text size="xs" ta="center">
            {text}
          </Text>
        )}
      </Stack>
    </Center>
  );
}

export default NoModel;
