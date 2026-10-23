import { Fieldset, SegmentedControl, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { FURNITURE_MOUNT_LABELS, FURNITURE_MOUNTS } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { MOUNT_HINTS } from './furnitureCard';
import FurnitureModelField from './FurnitureModelField';

// Поля обстановки (docs/plan/blocks.md, этап 8б): модель — вид, размер и свойства
// клеток для пути; крепление — где объект держится на карте.
function FurnitureFields({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const { mount } = form.getValues().furniture;
  return (
    <Fieldset legend="Обстановка">
      <Stack gap="md">
        <FurnitureModelField form={form} />
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Крепление
          </Text>
          <SegmentedControl
            w="fit-content"
            value={mount}
            onChange={(value) => form.setFieldValue('furniture.mount', value)}
            data={FURNITURE_MOUNTS.map((value) => ({
              value,
              label: FURNITURE_MOUNT_LABELS[value],
            }))}
          />
          <Text size="xs" c="dimmed">
            {MOUNT_HINTS[mount]}
          </Text>
        </Stack>
      </Stack>
    </Fieldset>
  );
}

export default FurnitureFields;
