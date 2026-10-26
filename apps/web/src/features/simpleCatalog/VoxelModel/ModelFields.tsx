import { Button, Fieldset, Group, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconCube } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import type { VoxelModelFields } from 'shared';
import { VoxelEditorModal } from '../../voxelModels';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import MeshFields from './mesh/MeshFields';
import MeshFileButton from './mesh/MeshFileButton';
import { modelCellsText, modelColorsText, modelSizeText } from './modelCard';

const lowerFirst = (text: string) => text[0].toLowerCase() + text.slice(1);

// Поле модели в форме (docs/plan/blocks.md, этапы 8а и 9): что сейчас в модели и кнопка
// редактора или загрузки файла; у модели с файлом — его настройки (MeshFields). Редактор открывается поверх формы, «Готово» кладёт модель в форму, а
// сохраняет её кнопка формы.
function ModelFields({ form }: { form: UseFormReturnType<SimpleFormValues> }) {
  const { model, modelMesh } = form.getValues();
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
        {modelMesh ? (
          <MeshFields form={form} draft={modelMesh} />
        ) : (
          <Group gap="xs" align="flex-start">
            <Button
              leftSection={<IconCube size={18} />}
              variant={empty ? 'filled' : 'light'}
              w="fit-content"
              onClick={() => setEditing(model)}
            >
              {empty ? 'Нарисовать модель' : 'Открыть редактор'}
            </Button>
            <MeshFileButton form={form} label="Загрузить .glb или STL" />
          </Group>
        )}
        {/* Почему форма ещё не сохраняется: файл сжимается или воксели из него считаются. */}
        {(form.errors.meshCompressing ?? form.errors.modelMesh) && (
          <Text size="sm" c="red">
            {form.errors.meshCompressing ?? form.errors.modelMesh}
          </Text>
        )}
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
