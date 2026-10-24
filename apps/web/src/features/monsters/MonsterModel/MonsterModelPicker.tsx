import {
  Alert,
  Button,
  FileButton,
  Group,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import {
  IconCube,
  IconExternalLink,
  IconPencil,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { emptyVoxelModel, type VoxelModel } from 'shared';
import { CompressPanel, useModelCompression } from '../../modelCompress';
import {
  ModelThumbnail,
  VoxelEditorModal,
  type OwnModels,
} from '../../voxelModels';
import { useMonsterModelActions } from './useMonsterModelActions';

interface Props {
  own: OwnModels;
  selected: VoxelModel | null;
  footprint: number;
  newName: () => string;
  onChoose: (model: VoxelModel) => void;
  onRemove: () => void;
}

// Выбор модели монстра: своя из списка, новый файл, нарисовать новую, поправить выбранную
// или убрать. Модель с файлом правится в «Моделях» (размер, верх, поворот, цвет) — в новой
// вкладке; список перечитается, когда вкладка формы снова в фокусе.
function MonsterModelPicker({
  own,
  selected,
  footprint,
  newName,
  onChoose,
  onRemove,
}: Props) {
  const { models } = own;
  const actions = useMonsterModelActions({
    own,
    newName,
    footprint,
    onChoose,
  });
  const { busy, editing, setEditing } = actions;
  // Файл до 10 МБ уходит сразу, 10–100 МБ — после сжатия в браузере, как у персонажа.
  const compression = useModelCompression((file) => actions.upload(file));
  const compressing = compression.state.kind === 'working';

  return (
    <Stack gap="xs">
      <Select
        label="Модель"
        placeholder={models ? 'Без модели' : 'Загружаем модели…'}
        searchable
        nothingFoundMessage="Своих моделей нет — загрузите файл или нарисуйте"
        data={(models ?? []).map((entry) => ({
          value: entry.id,
          label: entry.name,
        }))}
        value={selected?.id ?? null}
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
        allowDeselect={false}
      />
      <Group gap="xs">
        <FileButton
          accept=".glb,.stl,model/gltf-binary,model/stl"
          onChange={(file) => {
            if (!file) return;
            actions.setError(null);
            compression.choose(file);
          }}
        >
          {(props) => (
            <Button
              {...props}
              size="xs"
              variant="light"
              leftSection={<IconUpload size={16} />}
              loading={busy === 'upload' || compressing}
              disabled={compression.state.kind === 'offer'}
            >
              Загрузить файл .glb или STL
            </Button>
          )}
        </FileButton>
        <Button
          size="xs"
          variant="light"
          leftSection={<IconCube size={16} />}
          loading={busy === 'draw'}
          onClick={() => setEditing({ model: emptyVoxelModel(), target: null })}
        >
          Нарисовать новую
        </Button>
        {selected?.mesh ? (
          <Button
            size="xs"
            variant="default"
            leftSection={<IconExternalLink size={16} />}
            component={Link}
            to={`/models/${selected.id}/edit`}
            target="_blank"
          >
            Изменить модель
          </Button>
        ) : (
          <Button
            size="xs"
            variant="default"
            leftSection={<IconPencil size={16} />}
            disabled={!selected}
            loading={busy === 'edit'}
            onClick={() =>
              selected && setEditing({ model: selected, target: selected })
            }
          >
            Изменить модель
          </Button>
        )}
        <Button
          size="xs"
          variant="subtle"
          color="red"
          leftSection={<IconX size={16} />}
          disabled={!selected}
          onClick={onRemove}
        >
          Убрать модель
        </Button>
      </Group>
      <CompressPanel
        state={compression.state}
        onCompress={compression.compress}
        onCancel={compression.cancel}
      />
      {busy === 'upload' && (
        <Text size="sm" c="dimmed">
          Сохраняем модель в «Модели»…
        </Text>
      )}
      {actions.error && (
        <Alert color="red" p="xs">
          {actions.error}
        </Alert>
      )}
      <Suspense fallback={null}>
        {editing && (
          <VoxelEditorModal
            model={editing.model}
            title={
              editing.target
                ? `Модель «${editing.target.name}»`
                : 'Новая модель монстра'
            }
            onDone={actions.save}
            onClose={() => setEditing(null)}
          />
        )}
      </Suspense>
    </Stack>
  );
}

export default MonsterModelPicker;
