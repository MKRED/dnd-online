import { Group, Radio, Stack, Text } from '@mantine/core';
import type { Item } from 'shared';
import { formatWeight } from '../../items/itemLabels';
import { itemsCount, packOptions } from './inventoryView';

interface PackChoiceProps {
  pack: Extract<Item, { category: 'pack' }>;
  count: number;
  unpack: boolean;
  onChange: (unpack: boolean) => void;
}

// Набор кладут целиком или распаковывают в состав — сразу с весом обоих вариантов
// (набросок в docs/plan/done/character-inventory.md).
function PackChoice({ pack, count, unpack, onChange }: PackChoiceProps) {
  const options = packOptions(pack, count);
  const canUnpack = options.unpackedRows > 0;

  const option = (label: string, details: string) => (
    <Group justify="space-between" gap="xs" wrap="nowrap" w="100%">
      <Text size="sm">{label}</Text>
      <Text size="sm" c="dimmed">
        {details}
      </Text>
    </Group>
  );

  return (
    <Radio.Group
      label="Как положить набор"
      value={unpack ? 'unpack' : 'whole'}
      onChange={(value) => onChange(value === 'unpack')}
    >
      <Stack gap="xs" mt={6}>
        <Radio
          value="whole"
          label={option(
            'Целиком',
            `${itemsCount(1)} · ${formatWeight(options.wholeWeight)}`,
          )}
          styles={{ labelWrapper: { flex: 1 } }}
        />
        <Radio
          value="unpack"
          disabled={!canUnpack}
          label={option(
            'Распаковать',
            canUnpack
              ? `${itemsCount(options.unpackedRows)} · ${formatWeight(options.unpackedWeight)}`
              : 'нечего распаковать',
          )}
          description={
            options.hiddenCount > 0
              ? `Скрытые автором (${options.hiddenCount}) не будут добавлены`
              : undefined
          }
          styles={{ labelWrapper: { flex: 1 } }}
        />
      </Stack>
    </Radio.Group>
  );
}

export default PackChoice;
