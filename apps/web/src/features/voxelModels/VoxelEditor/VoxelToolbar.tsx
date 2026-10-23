import { ActionIcon, Group, Tooltip } from '@mantine/core';
import {
  IconArrowBackUp,
  IconArrowForwardUp,
  IconRotateClockwise,
} from '@tabler/icons-react';
import type { VoxelEditorState } from './useVoxelEditor';
import { VOXEL_TOOLS } from './voxelTools';

// Инструменты, отмена и поворот модели — верхний ряд панели.
function VoxelToolbar({ editor }: { editor: VoxelEditorState }) {
  return (
    <Group gap="xs" justify="space-between">
      <Group gap={4} role="radiogroup" aria-label="Инструмент">
        {VOXEL_TOOLS.map(({ tool, label, key, icon: ToolIcon }) => (
          <Tooltip key={tool} label={`${label} (${key})`}>
            <ActionIcon
              size="lg"
              variant={editor.tool === tool ? 'filled' : 'default'}
              role="radio"
              aria-checked={editor.tool === tool}
              aria-label={label}
              onClick={() => editor.setTool(tool)}
            >
              <ToolIcon size={18} />
            </ActionIcon>
          </Tooltip>
        ))}
      </Group>
      <Group gap={4}>
        <Tooltip label="Отменить (Ctrl+Z)">
          <ActionIcon
            size="lg"
            variant="default"
            aria-label="Отменить"
            disabled={!editor.canUndo}
            onClick={editor.undo}
          >
            <IconArrowBackUp size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Вернуть (Ctrl+Shift+Z)">
          <ActionIcon
            size="lg"
            variant="default"
            aria-label="Вернуть"
            disabled={!editor.canRedo}
            onClick={editor.redo}
          >
            <IconArrowForwardUp size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Повернуть модель на 90° по часовой — «вперёд» всегда к стрелке">
          <ActionIcon
            size="lg"
            variant="default"
            aria-label="Повернуть на 90°"
            onClick={editor.rotate}
          >
            <IconRotateClockwise size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}

export default VoxelToolbar;
