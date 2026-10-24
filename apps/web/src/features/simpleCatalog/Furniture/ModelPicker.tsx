import { Alert, Button, Group, Menu, Select, Stack, Text } from '@mantine/core';
import { IconBox, IconCube, IconPencil } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import {
  builtinContainerModel,
  CONTAINER_LOOK_LABELS,
  CONTAINER_LOOKS,
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
import { modelCellsText, modelSizeText } from '../VoxelModel/modelCard';
import type { OwnModels } from '../../voxelModels';

type Editing = { model: VoxelModelFields; target: VoxelModel | null };

interface Props {
  own: OwnModels;
  label: string;
  modelId: string;
  model: VoxelModelFields | null;
  error?: string;
  // Имя новой модели, нарисованной отсюда.
  newName: () => string;
  onChoose: (model: VoxelModel) => void;
}

// Выбор своей модели (docs/plan/blocks.md, этапы 8б и 8г): из списка, нарисовать новую
// или поправить выбранную — не уходя из формы. Нарисованная модель сохраняется в
// «Модели» сразу по «Готово», правка — тоже: модель — отдельная запись, её форма не
// сохраняет.
function ModelPicker({
  own,
  label,
  modelId,
  model,
  error: fieldError,
  newName,
  onChoose,
}: Props) {
  const { models, put } = own;
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = models?.find((entry) => entry.id === modelId);

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
          name: newName(),
          description: '',
          sources: [],
          isPublic: false,
          ...result,
        });
    request
      .then((saved) => {
        put(saved);
        onChoose(saved);
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
        label={label}
        placeholder={models ? 'Выберите свою модель' : 'Загружаем модели…'}
        searchable
        withAsterisk
        nothingFoundMessage="Своих моделей нет — нарисуйте новую"
        data={(models ?? []).map((entry) => ({
          value: entry.id,
          label: entry.name,
        }))}
        value={modelId || null}
        onChange={(id) => {
          const found = models?.find((entry) => entry.id === id);
          if (found) onChoose(found);
        }}
        renderOption={({ option }) => {
          const found = models?.find((entry) => entry.id === option.value);
          return (
            <Group gap="xs" wrap="nowrap">
              {found && (
                <ModelThumbnail
                  cacheKey={`${found.id}:${found.updatedAt}`}
                  model={found}
                  size={32}
                />
              )}
              <Text size="sm">{option.label}</Text>
            </Group>
          );
        }}
        error={fieldError}
        allowDeselect={false}
      />
      {model && (
        <Text size="sm" c="dimmed">
          {modelSizeText(model)}. Свойства клеток:{' '}
          {modelCellsText(model).toLowerCase()}.
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
        <Menu position="bottom-start">
          <Menu.Target>
            <Button
              size="xs"
              variant="default"
              leftSection={<IconBox size={16} />}
            >
              Начать со встроенного
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            {/* Свой вариант встроенного контейнера (этап 11): его модель — в редактор,
                «Готово» сохраняет её новой своей моделью. */}
            {CONTAINER_LOOKS.map((look) => (
              <Menu.Item
                key={look}
                onClick={() =>
                  setEditing({
                    model: builtinContainerModel(look),
                    target: null,
                  })
                }
              >
                {CONTAINER_LOOK_LABELS[look]}
              </Menu.Item>
            ))}
          </Menu.Dropdown>
        </Menu>
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
      {error && (
        <Alert color="red" p="xs">
          {error}
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

export default ModelPicker;
