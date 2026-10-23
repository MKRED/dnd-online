import {
  ActionIcon,
  Alert,
  Button,
  ColorInput,
  Group,
  Loader,
  NumberInput,
  SegmentedControl,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { IconGrid3x3, IconRotateClockwise } from '@tabler/icons-react';
import { Suspense, useState } from 'react';
import {
  MODEL_SIZE_MAX,
  type ModelMeshFit,
  type Vec3,
  type VoxelModelFields,
} from 'shared';
import {
  MeshVoxelizer,
  VoxelEditorModal,
  type MeshVoxels,
} from '../../../voxelModels';
import type { SimpleFormValues } from '../../SimpleEntryForm/simpleEntryValues';
import { meshDraftReady, resizedEmpty, type MeshDraft } from './meshDraft';
import MeshFileButton from './MeshFileButton';

const AXES = [
  { label: 'Ширина', axis: 0 },
  { label: 'Глубина', axis: 2 },
  { label: 'Высота', axis: 1 },
] as const;

const FORMAT_LABELS = { stl: 'STL', glb: '.glb' } as const;

interface Props {
  form: UseFormReturnType<SimpleFormValues>;
  draft: MeshDraft;
}

// Модель с загруженным файлом (docs/plan/blocks.md, этап 9): на карте — сам файл, для
// правил — воксели из него, они пересчитываются сами при смене файла, размера, верха,
// поворота и цвета. Править можно размер, вписывание, цвет STL и свойства клеток.
function MeshFields({ form, draft }: Props) {
  const { model } = form.getValues();
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<VoxelModelFields | null>(null);
  const ready = meshDraftReady(draft, model.size);

  const setDraft = (patch: Partial<MeshDraft>) =>
    form.setFieldValue('modelMesh', { ...draft, ...patch });
  const setFit = (fit: Partial<ModelMeshFit>) =>
    setDraft({ fit: { ...draft.fit, ...fit } });
  const resize = (axis: number, value: number) => {
    const size = [...model.size] as [number, number, number];
    size[axis] = value;
    form.setFieldValue('model', resizedEmpty(model, size as Vec3));
  };
  const applyVoxels = (result: MeshVoxels) => {
    const current = form.getValues();
    form.setFieldValue('model', {
      ...current.model,
      voxels: result.voxels,
      palette: result.palette,
    });
    if (current.modelMesh)
      form.setFieldValue('modelMesh', {
        ...current.modelMesh,
        voxelsKey: result.key,
      });
  };

  return (
    <Stack gap="sm">
      <Text size="sm">
        Загружена из файла {FORMAT_LABELS[draft.format]}: на карте модель
        выглядит как в файле, а путь, укрытие и обзор считаются по вокселям из
        него.
      </Text>
      <Group gap="xs" align="flex-end" wrap="nowrap">
        {AXES.map(({ label, axis }) => (
          <NumberInput
            key={axis}
            label={label}
            size="xs"
            w={72}
            min={1}
            max={MODEL_SIZE_MAX}
            clampBehavior="strict"
            allowDecimal={false}
            value={model.size[axis]}
            onChange={(value) => {
              if (typeof value === 'number' && value !== model.size[axis])
                resize(axis, value);
            }}
          />
        ))}
        <Text size="xs" c="dimmed" pb={6}>
          клеток
        </Text>
      </Group>
      <Group gap="md" align="flex-end">
        <Stack gap={4}>
          <Text size="sm" fw={500}>
            Верх файла
          </Text>
          <SegmentedControl
            size="xs"
            value={draft.fit.up}
            onChange={(up) => setFit({ up: up })}
            data={[
              { value: 'y', label: 'Ось Y' },
              { value: 'z', label: 'Ось Z' },
            ]}
          />
        </Stack>
        <Tooltip label="Повернуть на 90° по часовой — лицом к стрелке «вперёд»">
          <ActionIcon
            size="lg"
            variant="default"
            aria-label="Повернуть модель на 90°"
            onClick={() =>
              setFit({
                turn: ((draft.fit.turn + 1) % 4) as ModelMeshFit['turn'],
              })
            }
          >
            <IconRotateClockwise size={18} />
          </ActionIcon>
        </Tooltip>
        {draft.format === 'stl' && (
          <ColorInput
            size="xs"
            w={130}
            label="Цвет"
            format="hex"
            value={draft.color ?? ''}
            onChange={(color) => {
              if (/^#[0-9a-f]{6}$/i.test(color))
                setDraft({ color: color.toLowerCase() });
            }}
          />
        )}
      </Group>
      {!ready && !error && (
        <Group gap="xs">
          <Loader size="xs" />
          <Text size="sm" c="dimmed">
            Считаем воксели для правил…
          </Text>
        </Group>
      )}
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
      <Group gap="xs">
        <Button
          size="xs"
          variant="light"
          leftSection={<IconGrid3x3 size={16} />}
          disabled={!ready}
          onClick={() => setEditing(model)}
        >
          Свойства клеток
        </Button>
        <MeshFileButton form={form} label="Заменить файл" />
        <Button
          size="xs"
          variant="subtle"
          color="red"
          onClick={() => form.setFieldValue('modelMesh', null)}
        >
          Убрать файл
        </Button>
      </Group>
      <Suspense fallback={null}>
        <MeshVoxelizer
          source={draft.source}
          fit={draft.fit}
          size={model.size}
          color={draft.color}
          currentKey={draft.voxelsKey}
          onVoxels={applyVoxels}
          onError={setError}
        />
        {editing && (
          <VoxelEditorModal
            model={editing}
            cellsOnly
            title={`Свойства клеток «${form.getValues().name || 'без названия'}»`}
            onDone={(result) =>
              form.setFieldValue('model', {
                ...form.getValues().model,
                cells: result.cells,
              })
            }
            onClose={() => setEditing(null)}
          />
        )}
      </Suspense>
    </Stack>
  );
}

export default MeshFields;
