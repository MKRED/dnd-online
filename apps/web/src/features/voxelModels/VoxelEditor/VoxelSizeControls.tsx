import { Button, Group, NumberInput, Stack, Text } from '@mantine/core';
import { useState } from 'react';
import { MODEL_SIZE_MAX, type Vec3 } from 'shared';
import type { VoxelEditorState } from './useVoxelEditor';

const AXES = [
  { label: 'Ширина', axis: 0 },
  { label: 'Глубина', axis: 2 },
  { label: 'Высота', axis: 1 },
] as const;

const sameSize = (a: Vec3, b: Vec3) => a.every((v, i) => v === b[i]);

// Размер модели в клетках карты: черновик в полях, «Применить» меняет сетку. Урезание,
// после которого пропадут воксели, спрашивает.
function VoxelSizeControls({ editor }: { editor: VoxelEditorState }) {
  const { size } = editor.grid;
  const [draft, setDraft] = useState<Vec3>(size);
  // Отмена или поворот поменяли размер — черновик за ним (сравнение во время
  // отрисовки, без эффекта: https://react.dev/learn/you-might-not-need-an-effect).
  const [shown, setShown] = useState<Vec3>(size);
  if (!sameSize(shown, size)) {
    setShown(size);
    setDraft(size);
  }

  const apply = () =>
    editor.resize(draft, (lost) =>
      window.confirm(
        `Модель станет меньше, и ${lost} вокселей за новым краем пропадут. Уменьшить?`,
      ),
    ) || setDraft(size);

  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        Размер в клетках
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
            value={draft[axis]}
            onChange={(value) => {
              if (typeof value !== 'number') return;
              const next = [...draft] as [number, number, number];
              next[axis] = value;
              setDraft(next);
            }}
          />
        ))}
        <Button
          size="xs"
          variant="default"
          disabled={sameSize(draft, size)}
          onClick={apply}
        >
          Применить
        </Button>
      </Group>
      <Text size="xs" c="dimmed">
        Клетка карты — 5 футов, в ней 16 вокселей по каждой стороне. До{' '}
        {MODEL_SIZE_MAX} клеток.
      </Text>
    </Stack>
  );
}

export default VoxelSizeControls;
