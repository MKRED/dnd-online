import { Group, Radio, Stack, Text } from '@mantine/core';
import { MODEL_CELL_KIND_LABELS, MODEL_CELL_KINDS } from 'shared';
import { CELL_KIND_COLORS } from './cellKindColors';
import type { VoxelEditorState } from './useVoxelEditor';

const Dot = ({ color }: { color: string }) => (
  <span
    aria-hidden
    style={{
      display: 'inline-block',
      width: 12,
      height: 12,
      borderRadius: 3,
      background: color,
    }}
  />
);

// Режим «Свойства клеток»: что поставить в клетку кликом (docs/plan/blocks.md, «Модели
// и двери»). Без своего свойства клетка с вокселями — препятствие, пустая — свободна.
function VoxelCellControls({ editor }: { editor: VoxelEditorState }) {
  return (
    <Stack gap="xs">
      <Radio.Group
        label="Свойство клетки для пути"
        value={editor.cellTool}
        onChange={(value) => editor.setCellTool(value)}
      >
        <Stack gap={6} mt={4}>
          {MODEL_CELL_KINDS.map((kind) => (
            <Radio
              key={kind}
              value={kind}
              label={
                <Group gap={6} wrap="nowrap" component="span">
                  <Dot color={CELL_KIND_COLORS[kind]} />
                  {MODEL_CELL_KIND_LABELS[kind]}
                </Group>
              }
            />
          ))}
          <Radio value="auto" label="Как есть — убрать своё" />
        </Stack>
      </Radio.Group>
      <Text size="xs" c="dimmed">
        Кликните по клетке. Как есть: клетка с вокселями — препятствие, пустая —
        свободна. Яркие — свои свойства, бледные — как есть. Открытую дверь
        помечают «Свободно», хотя створка в клетке есть; стол — «Можно встать
        сверху».
      </Text>
    </Stack>
  );
}

export default VoxelCellControls;
