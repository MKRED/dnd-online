import { Fieldset, SegmentedControl, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  FURNITURE_MOUNT_LABELS,
  FURNITURE_MOUNTS,
  type FurnitureMount,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { MOUNT_HINTS } from './furnitureCard';
import { startPositions } from './furnitureForm';
import FurnitureModelField from './FurnitureModelField';

// Поля обстановки (docs/plan/blocks.md, этапы 8б и 8г): модель или модели положений —
// вид, размер и свойства клеток для пути; крепление — где объект держится на карте.
function FurnitureFields({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const { furniture } = form.getValues();
  const { mount } = furniture;
  // Дверь без положений не открыть: «Проём» сразу включает «Закрыта» и «Открыта».
  const changeMount = (value: FurnitureMount) => {
    form.setFieldValue('furniture.mount', value);
    if (value === 'doorway' && !furniture.positions.length)
      form.setFieldValue(
        'furniture.positions',
        startPositions({ ...furniture, mount: value }),
      );
  };
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
            onChange={(value) => changeMount(value)}
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
