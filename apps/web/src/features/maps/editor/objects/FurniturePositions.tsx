import { SegmentedControl, Stack, Switch, Text } from '@mantine/core';
import type { FurnitureRefView, MapObject } from 'shared';
import type { ObjectTool } from './useObjectTool';

interface Props {
  tool: ObjectTool;
  object: MapObject & { kind: 'furniture' };
  view: FurnitureRefView | undefined;
  busy: boolean;
}

// Положение двери и «Заперта» (docs/plan/blocks.md, этап 8г): переключение — операция
// журнала, видно всем сразу и отменяется. Обстановка без положений их не показывает.
function FurniturePositions({ tool, object, view, busy }: Props) {
  if (view?.missing !== null || view.positions.length < 2) return null;
  const current = Math.min(object.position ?? 0, view.positions.length - 1);
  return (
    <Stack gap={4}>
      <Text size="sm" fw={500}>
        Положение
      </Text>
      <SegmentedControl
        size="xs"
        fullWidth
        data={view.positions.map((position, index) => ({
          value: String(index),
          label: position.name,
        }))}
        value={String(current)}
        onChange={(value) => tool.setPosition(Number(value))}
        disabled={busy}
      />
      <Text size="xs" c="dimmed">
        Если мешает блок или объект, переключите с Shift — без проверки.
      </Text>
      <Switch
        size="sm"
        mt={4}
        label="Заперта"
        checked={object.locked ?? false}
        onChange={(e) => tool.update({ locked: e.currentTarget.checked })}
        disabled={busy}
      />
    </Stack>
  );
}

export default FurniturePositions;
