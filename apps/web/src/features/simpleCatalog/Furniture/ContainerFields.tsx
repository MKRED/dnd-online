import { NumberInput, Select, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import {
  CONTAINER_CAPACITY_MAX,
  LOCK_DC_LABELS,
  LOCK_DCS,
  type FurnitureContainer,
  type LockDc,
} from 'shared';
import ContainerItems from '../../maps/editor/objects/ContainerItems';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';

const LOCK_OPTIONS = [
  { value: '', label: 'Без замка' },
  ...LOCK_DCS.map((dc) => ({ value: String(dc), label: LOCK_DC_LABELS[dc] })),
];

// Поля контейнера-обстановки (docs/plan/blocks.md, этап 11): вместимость, замок и то, с
// чем он ставится на карту. Груз содержимого — против вместимости, как на карте.
function ContainerFields({
  form,
  container,
}: {
  form: UseFormReturnType<SimpleFormValues>;
  container: FurnitureContainer;
}) {
  const set = (patch: Partial<FurnitureContainer>) =>
    form.setFieldValue('furniture.container', { ...container, ...patch });
  const { contentItems } = form.getValues().furniture;
  return (
    <Stack gap="sm">
      <NumberInput
        label="Вместимость, фнт."
        description="Правило дома: 30 фнт. на кубический фут объёма из книги (сундук — 360, бочка — 120, мешок — 30)"
        min={0.01}
        max={CONTAINER_CAPACITY_MAX}
        decimalScale={2}
        w={240}
        value={container.capacity}
        onChange={(value) => {
          if (typeof value === 'number') set({ capacity: value });
        }}
        error={form.getInputProps('furniture.container').error as string}
      />
      <Select
        label="Замок"
        description="Сл проверки Ловкости (Ловкость рук) с воровскими инструментами, DMG 2024"
        w={240}
        data={LOCK_OPTIONS}
        value={container.lockDc === null ? '' : String(container.lockDc)}
        onChange={(value) =>
          set({ lockDc: value ? (Number(value) as LockDc) : null })
        }
        allowDeselect={false}
      />
      {/* Enter в поиске предмета выбирает его, а не отправляет форму обстановки. */}
      <Stack
        gap={4}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.preventDefault();
        }}
      >
        <Text size="sm" fw={500}>
          Содержимое по умолчанию
        </Text>
        <Text size="xs" c="dimmed">
          С ним контейнер ставится на карту; там его можно поменять.
        </Text>
        <ContainerItems
          items={container.contents}
          capacity={container.capacity}
          refs={contentItems}
          disabled={false}
          onChange={(contents, added) => {
            set({ contents });
            if (added)
              form.setFieldValue('furniture.contentItems', {
                ...contentItems,
                [added.id]: {
                  missing: null,
                  name: added.name,
                  image: null,
                  weight: added.weight ?? 0,
                },
              });
          }}
        />
      </Stack>
    </Stack>
  );
}

export default ContainerFields;
