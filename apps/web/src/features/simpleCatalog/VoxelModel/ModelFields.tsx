import { Button, Fieldset, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconCube } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import type { VoxelModelFields } from 'shared';
import { VoxelEditorModal } from '../../voxelModels';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { modelCellsText, modelColorsText, modelSizeText } from './modelCard';

const lowerFirst = (text: string) => text[0].toLowerCase() + text.slice(1);

// Поле модели в форме (docs/plan/blocks.md, этап 8а): что сейчас в модели и кнопка
// редактора. Редактор открывается поверх формы, «Готово» кладёт модель в форму, а
// сохраняет её кнопка формы.
function ModelFields({ form }: { form: UseFormReturnType<SimpleFormValues> }) {
  const { model } = form.getValues();
  const [editing, setEditing] = useState<VoxelModelFields | null>(null);
  const empty = model.palette.length === 0;
  return (
    <Fieldset legend="Модель">
      <Stack gap="xs">
        <Text size="sm">{modelSizeText(model)}</Text>
        <Text size="sm" c="dimmed">
          {modelColorsText(model)}. Свойства клеток:{' '}
          {lowerFirst(modelCellsText(model))}.
        </Text>
        <Button
          leftSection={<IconCube size={18} />}
          variant={empty ? 'filled' : 'light'}
          w="fit-content"
          onClick={() => setEditing(model)}
        >
          {empty ? 'Нарисовать модель' : 'Открыть редактор'}
        </Button>
      </Stack>
      <Suspense fallback={null}>
        {editing && (
          <VoxelEditorModal
            model={editing}
            title={`Модель «${form.getValues().name || 'без названия'}»`}
            onDone={(result) => form.setFieldValue('model', result)}
            onClose={() => setEditing(null)}
          />
        )}
      </Suspense>
    </Fieldset>
  );
}

export default ModelFields;
