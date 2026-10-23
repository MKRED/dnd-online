import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Paper,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import {
  FURNITURE_POSITION_NAME_MAX,
  FURNITURE_POSITIONS_MAX,
  type VoxelModel,
} from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { positionValues } from './furnitureForm';
import ModelPicker from './ModelPicker';
import type { OwnModels } from './useOwnModels';

interface Props {
  form: UseFormReturnType<SimpleFormValues>;
  own: OwnModels;
  newName: () => string;
}

// Положения обстановки (docs/plan/blocks.md, этап 8г): имя и своя модель у каждого, от
// двух до восьми. Первое — то, в котором объект ставится на карту.
function PositionsField({ form, own, newName }: Props) {
  const { positions } = form.getValues().furniture;
  const path = (index: number) => `furniture.positions.${index}` as const;

  const choose = (index: number, model: VoxelModel) => {
    form.setFieldValue(`${path(index)}.modelId`, model.id);
    form.setFieldValue(`${path(index)}.model`, model);
  };

  return (
    <Stack gap="sm">
      {positions.map((position, index) => (
        <Paper key={position.key} withBorder p="sm">
          <Stack gap="xs">
            <Group gap="xs" align="flex-end" wrap="nowrap">
              <TextInput
                label="Положение"
                placeholder="Например, «Открыта»"
                withAsterisk
                maxLength={FURNITURE_POSITION_NAME_MAX}
                style={{ flex: 1 }}
                {...form.getInputProps(`${path(index)}.name`)}
              />
              <Tooltip
                label={
                  positions.length > 2
                    ? 'Убрать положение'
                    : 'Положений не меньше двух'
                }
              >
                <ActionIcon
                  variant="subtle"
                  color="red"
                  size="lg"
                  mb={form.errors[`${path(index)}.name`] ? 22 : 0}
                  disabled={positions.length <= 2}
                  aria-label="Убрать положение"
                  onClick={() =>
                    form.removeListItem('furniture.positions', index)
                  }
                >
                  <IconTrash size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>
            {index === 0 && (
              <Badge variant="light" size="sm" w="fit-content">
                В нём ставится на карту
              </Badge>
            )}
            <ModelPicker
              own={own}
              label="Модель положения"
              modelId={position.modelId}
              model={position.model}
              error={
                form.getInputProps(`${path(index)}.modelId`).error as string
              }
              newName={() => `${newName()}: ${position.name.trim()}`}
              onChoose={(model) => choose(index, model)}
            />
          </Stack>
        </Paper>
      ))}
      <Button
        size="xs"
        variant="default"
        w="fit-content"
        leftSection={<IconPlus size={16} />}
        disabled={positions.length >= FURNITURE_POSITIONS_MAX}
        onClick={() =>
          form.insertListItem(
            'furniture.positions',
            positionValues(`Положение ${positions.length + 1}`),
          )
        }
      >
        Добавить положение
      </Button>
    </Stack>
  );
}

export default PositionsField;
