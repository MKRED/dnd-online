import { Stack, Text } from '@mantine/core';
import { carriedLoad, carryingCapacity, type InventoryEntry } from 'shared';

const numberFormat = new Intl.NumberFormat('ru-RU', {
  maximumFractionDigits: 2,
});

interface LoadSummaryProps {
  entries: readonly InventoryEntry[];
  strength: number;
}

// Груз при себе против грузоподъёмности (docs/dnd/carrying.md). Перегруз ничего не
// запрещает — только красное число: последствия считает мастер в сессии.
function LoadSummary({ entries, strength }: LoadSummaryProps) {
  const { weight, missing } = carriedLoad(entries);
  const { carry, dragLiftPush } = carryingCapacity(strength);
  const over = weight > carry;

  return (
    <Stack gap={0}>
      <Text size="sm">
        Груз{' '}
        <Text span fw={700} c={over ? 'red' : undefined}>
          {numberFormat.format(weight)} / {numberFormat.format(carry)} фнт.
        </Text>
        {over && (
          <Text span c="red">
            {' '}
            — перегруз
          </Text>
        )}
      </Text>
      <Text size="xs" c="dimmed">
        Тащить, поднять, толкать — до {numberFormat.format(dragLiftPush)} фнт.
      </Text>
      {/* Вес скрытых и удалённых не считается и не раскрывается. */}
      {missing > 0 && (
        <Text size="xs" c="dimmed">
          Без скрытых и удалённых предметов
        </Text>
      )}
    </Stack>
  );
}

export default LoadSummary;
