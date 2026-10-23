import {
  Alert,
  Anchor,
  Button,
  Group,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconCube, IconPencil } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  emptyVoxelModel,
  type VoxelModel,
  type VoxelModelFields,
} from 'shared';
import { errorMessage } from '../../../lib/apiRequest';
import {
  ModelThumbnail,
  VoxelEditorModal,
  voxelModelsApi,
} from '../../voxelModels';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import { modelCellsText, modelSizeText } from '../VoxelModel/modelCard';
import { useOwnModels } from './useOwnModels';

type Editing = { model: VoxelModelFields; target: VoxelModel | null };

// Модель обстановки (docs/plan/blocks.md, этап 8б): выбрать свою, нарисовать новую или
// поправить выбранную — не уходя из формы. Нарисованная модель сохраняется в «Модели»
// сразу по «Готово», правка — тоже: модель — отдельная запись, её форма не сохраняет.
function FurnitureModelField({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const { models, error: loadError, put } = useOwnModels();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { furniture } = form.getValues();
  const selected = models?.find((model) => model.id === furniture.modelId);

  const choose = (model: VoxelModel) => {
    form.setFieldValue('furniture.modelId', model.id);
    form.setFieldValue('furniture.model', model);
  };

  const save = (result: VoxelModelFields) => {
    const target = editing?.target ?? null;
    setBusy(true);
    setError(null);
    const request = target
      ? voxelModelsApi.update(target.id, {
          name: target.name,
          description: target.description,
          sources: target.sources,
          isPublic: target.isPublic,
          ...result,
        })
      : voxelModelsApi.create({
          name: form.getValues().name.trim() || 'Модель обстановки',
          description: '',
          sources: [],
          isPublic: false,
          ...result,
        });
    request
      .then((model) => {
        put(model);
        choose(model);
      })
      .catch((err: unknown) => {
        console.error('Failed to save the furniture model', err);
        setError(errorMessage(err, 'Не удалось сохранить модель'));
      })
      .finally(() => setBusy(false));
  };

  return (
    <Stack gap="xs">
      <Select
        label="Модель"
        placeholder={models ? 'Выберите свою модель' : 'Загружаем модели…'}
        searchable
        withAsterisk
        nothingFoundMessage="Своих моделей нет — нарисуйте новую"
        data={(models ?? []).map((model) => ({
          value: model.id,
          label: model.name,
        }))}
        value={furniture.modelId || null}
        onChange={(id) => {
          const model = models?.find((entry) => entry.id === id);
          if (model) choose(model);
        }}
        renderOption={({ option }) => {
          const model = models?.find((entry) => entry.id === option.value);
          return (
            <Group gap="xs" wrap="nowrap">
              {model && (
                <ModelThumbnail
                  cacheKey={`${model.id}:${model.updatedAt}`}
                  model={model}
                  size={32}
                />
              )}
              <Text size="sm">{option.label}</Text>
            </Group>
          );
        }}
        error={form.getInputProps('furniture.modelId').error as string}
        allowDeselect={false}
      />
      {furniture.model && (
        <Text size="sm" c="dimmed">
          {modelSizeText(furniture.model)}. Свойства клеток:{' '}
          {modelCellsText(furniture.model).toLowerCase()}.
        </Text>
      )}
      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconCube size={16} />}
          loading={busy && !editing?.target}
          onClick={() => setEditing({ model: emptyVoxelModel(), target: null })}
        >
          Нарисовать новую
        </Button>
        <Button
          size="xs"
          variant="default"
          leftSection={<IconPencil size={16} />}
          disabled={!selected}
          loading={busy && Boolean(editing?.target)}
          onClick={() =>
            selected && setEditing({ model: selected, target: selected })
          }
        >
          Изменить модель
        </Button>
      </Group>
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
      {(error ?? loadError) && (
        <Alert color="red" p="xs">
          {error ?? loadError}
        </Alert>
      )}
      <Suspense fallback={null}>
        {editing && (
          <VoxelEditorModal
            model={editing.model}
            title={
              editing.target
                ? `Модель «${editing.target.name}»`
                : 'Новая модель обстановки'
            }
            onDone={save}
            onClose={() => setEditing(null)}
          />
        )}
      </Suspense>
    </Stack>
  );
}

export default FurnitureModelField;
