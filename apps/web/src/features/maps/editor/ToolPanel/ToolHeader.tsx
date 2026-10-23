import { Group, Kbd, Text, ThemeIcon } from '@mantine/core';
import { EDITOR_TOOLS, TOOL_LABELS, type EditorTool } from '../editorTools';
import { TOOL_ICONS } from '../toolIcons';
import { TOOL_SUMMARIES } from './toolTexts';

// Шапка свойств инструмента: значок, название, что делает, клавиша. Клавиша — место в
// полосе: на сцене игры без «Хода» порядок первых шести тот же, что в редакторе карты.
function ToolHeader({ tool }: { tool: EditorTool }) {
  const Icon = TOOL_ICONS[tool];
  const danger = tool === 'erase';
  return (
    <Group gap="sm" wrap="nowrap">
      <ThemeIcon
        size={36}
        radius="md"
        variant="light"
        color={danger ? 'red' : undefined}
      >
        <Icon size={20} />
      </ThemeIcon>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text fw={600}>{TOOL_LABELS[tool]}</Text>
        <Text size="xs" c="dimmed">
          {TOOL_SUMMARIES[tool]}
        </Text>
      </div>
      <Kbd>{EDITOR_TOOLS.indexOf(tool) + 1}</Kbd>
    </Group>
  );
}

export default ToolHeader;
