import { Checkbox, Stack, Text } from '@mantine/core';
import FacingPicker from './FacingPicker';
import { rightFacing } from './objectPlacement';
import type { ObjectTool } from './useObjectTool';

// Как ставится выбранный объект: взгляд и «скрытым» (что ставить — в окне «Что поставить»,
// docs/plan/blocks.md, этап 10).
function PlaceSection({ tool }: { tool: ObjectTool }) {
  const { choice, facing, hidden } = tool.settings;
  if (!choice) return null;
  const furniture = choice.kind === 'furniture';

  return (
    <Stack gap="sm">
      {furniture && (
        <Text size="xs" c="dimmed">
          Ставится, только если в клетках нет блоков и объектов и есть опора по
          креплению. Shift+клик — без проверки: закопать клад, вмуровать
          решётку.
        </Text>
      )}
      {choice.kind !== 'item' && (
        <FacingPicker
          value={furniture ? rightFacing(facing) : facing}
          onChange={tool.setFacing}
          rightOnly={furniture}
        />
      )}
      {/* Засаду ставят сразу скрытой: в открытой сцене объект, спрятанный после
          постановки, игроки успели бы увидеть. */}
      <Checkbox
        size="xs"
        label="Ставить скрытым от игроков"
        description="Снять скрытие — в свойствах объекта"
        checked={hidden}
        onChange={(e) => tool.setHidden(e.currentTarget.checked)}
      />
    </Stack>
  );
}

export default PlaceSection;
