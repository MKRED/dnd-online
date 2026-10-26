import { Group, Kbd, Text, ThemeIcon } from '@mantine/core';
import {
  EDITOR_TOOLS,
  stripTool,
  TOOL_LABELS,
  type EditorTool,
} from '../editorTools';
import { TOOL_ICONS } from '../toolIcons';
import { TOOL_SUMMARIES } from './toolTexts';

// Шапка свойств инструмента: значок, название, что делает, клавиша. Клавиша — место в
// полосе: на сцене игры своя полоса, со «Существами» и без «Хода».
// hint — на телефоне вместо строки о инструменте: что сделает касание (плашки на сцене
// там нет, docs/plan/done/scene-page.md, «Телефон»).
function ToolHeader({
  tool,
  hint,
  tools = EDITOR_TOOLS,
}: {
  tool: EditorTool;
  hint?: string;
  // Полоса, на которой стоит инструмент: клавиша — место в ней.
  tools?: readonly EditorTool[];
}) {
  // У режимов «Строить» шапка одна — кнопки полосы.
  const strip = stripTool(tool);
  const Icon = TOOL_ICONS[strip];
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
          {hint ?? TOOL_SUMMARIES[strip]}
        </Text>
      </div>
      <Kbd>{tools.indexOf(strip) + 1}</Kbd>
    </Group>
  );
}

export default ToolHeader;
