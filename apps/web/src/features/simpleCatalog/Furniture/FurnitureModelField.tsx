import { Alert, Anchor, Stack, Switch, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { Link } from 'react-router-dom';
import type { VoxelModel } from 'shared';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { startPositions } from './furnitureForm';
import ModelPicker from './ModelPicker';
import PositionsField from './PositionsField';
import { useOwnModels } from './useOwnModels';

// Модель обстановки или модели её положений (docs/plan/blocks.md, этапы 8б и 8г): у
// двери, сундука, рычага — несколько положений со своими моделями, на карте их
// переключают. Выключение положений оставляет модель первого.
function FurnitureModelField({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const own = useOwnModels();
  const { furniture } = form.getValues();
  const withPositions = furniture.positions.length > 0;
  const newName = () => form.getValues().name.trim() || 'Модель обстановки';

  const choose = (model: VoxelModel) => {
    form.setFieldValue('furniture.modelId', model.id);
    form.setFieldValue('furniture.model', model);
  };

  const togglePositions = (on: boolean) => {
    if (on) {
      form.setFieldValue('furniture.positions', startPositions(furniture));
      return;
    }
    const [first] = furniture.positions;
    form.setFieldValue('furniture.modelId', first?.modelId ?? '');
    form.setFieldValue('furniture.model', first?.model ?? null);
    form.setFieldValue('furniture.positions', []);
  };

  return (
    <Stack gap="xs">
      <Switch
        label="Несколько положений"
        description="Дверь, сундук, рычаг: у каждого положения своя модель, на карте их переключают"
        checked={withPositions}
        onChange={(event) => togglePositions(event.currentTarget.checked)}
      />
      {withPositions ? (
        <PositionsField form={form} own={own} newName={newName} />
      ) : (
        <ModelPicker
          own={own}
          label="Модель"
          modelId={furniture.modelId}
          model={furniture.model}
          error={form.getInputProps('furniture.modelId').error as string}
          newName={newName}
          onChoose={choose}
        />
      )}
      <Text size="xs" c="dimmed">
        Только свои модели: чужую сначала скопируйте себе в{' '}
        <Anchor
          component={Link}
          to="/models?tab=catalog"
          target="_blank"
          size="xs"
        >
          «Моделях»
        </Anchor>
        . Правка модели сохраняется сразу и меняет её во всей обстановке с ней.
      </Text>
      {own.error && (
        <Alert color="red" p="xs">
          {own.error}
        </Alert>
      )}
    </Stack>
  );
}

export default FurnitureModelField;
