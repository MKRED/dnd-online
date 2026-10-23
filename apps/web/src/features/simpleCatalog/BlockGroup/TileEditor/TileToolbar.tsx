import { ActionIcon, Group, Tooltip } from '@mantine/core';
import { IconArrowBackUp, IconArrowForwardUp } from '@tabler/icons-react';
import { TILE_TOOLS } from './tileTools';
import type { TileTool } from './useTileEditor';

interface TileToolbarProps {
  tool: TileTool;
  onTool: (tool: TileTool) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

function TileToolbar(props: TileToolbarProps) {
  const { tool, onTool, canUndo, canRedo, onUndo, onRedo } = props;
  return (
    <Group gap="xs" justify="space-between">
      <Group gap={4} role="radiogroup" aria-label="Инструмент">
        {TILE_TOOLS.map(({ tool: value, label, key, icon: ToolIcon }) => (
          <Tooltip key={value} label={`${label} (${key})`}>
            <ActionIcon
              size="lg"
              variant={tool === value ? 'filled' : 'default'}
              role="radio"
              aria-checked={tool === value}
              aria-label={label}
              onClick={() => onTool(value)}
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
            disabled={!canUndo}
            onClick={onUndo}
          >
            <IconArrowBackUp size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label="Вернуть (Ctrl+Shift+Z)">
          <ActionIcon
            size="lg"
            variant="default"
            aria-label="Вернуть"
            disabled={!canRedo}
            onClick={onRedo}
          >
            <IconArrowForwardUp size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}

export default TileToolbar;
