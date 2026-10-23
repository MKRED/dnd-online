import {
  Chip,
  Group,
  SegmentedControl,
  Slider,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';
import { BRUSH_SIZES, type BrushSize } from '../voxelBrush';
import type { VoxelEditorState } from './useVoxelEditor';

// Кисть, зеркало и срез по высоте.
function VoxelBrushControls({ editor }: { editor: VoxelEditorState }) {
  const height = editor.grid.dims[1];
  return (
    <Stack gap="sm">
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Кисть, вокселей
        </Text>
        <SegmentedControl
          size="xs"
          value={String(editor.brush)}
          onChange={(value) => editor.setBrush(Number(value) as BrushSize)}
          data={BRUSH_SIZES.map((size) => ({
            value: String(size),
            label: size === 16 ? '16 — клетка' : String(size),
          }))}
        />
      </Stack>
      <Group gap="xs">
        <Tooltip label="Каждая правка повторяется с другой стороны: слева — справа">
          <Chip
            size="xs"
            checked={editor.mirror.x}
            onChange={(x) => editor.setMirror({ ...editor.mirror, x })}
          >
            Зеркало ↔
          </Chip>
        </Tooltip>
        <Tooltip label="Каждая правка повторяется с другой стороны: спереди — сзади">
          <Chip
            size="xs"
            checked={editor.mirror.z}
            onChange={(z) => editor.setMirror({ ...editor.mirror, z })}
          >
            Зеркало ↕
          </Chip>
        </Tooltip>
      </Group>
      <Stack gap={4}>
        <Text size="sm" fw={500}>
          Срез по высоте
        </Text>
        <Slider
          min={1}
          max={height}
          value={editor.sliceTop}
          onChange={editor.setSliceTop}
          label={(value) => `${value} из ${height}`}
          aria-label="Срез по высоте"
        />
        <Text size="xs" c="dimmed">
          {editor.sliceTop < height
            ? `Видно ${editor.sliceTop} нижних слоёв из ${height} — верхние скрыты, чтобы добраться до внутренних.`
            : 'Видна вся модель. Сдвиньте, чтобы скрыть верхние слои.'}
        </Text>
      </Stack>
    </Stack>
  );
}

export default VoxelBrushControls;
