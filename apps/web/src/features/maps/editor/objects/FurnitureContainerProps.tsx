import { Stack, Switch, Text } from '@mantine/core';
import {
  LOCK_DC_LABELS,
  type FurnitureRefView,
  type MapObject,
  type MapObjectRefsView,
} from 'shared';
import { NameInput } from './CommitInputs';
import ContainerItems from './ContainerItems';
import type { ObjectTool } from './useObjectTool';

interface Props {
  tool: ObjectTool;
  object: MapObject & { kind: 'furniture' };
  view: FurnitureRefView | undefined;
  refs: MapObjectRefsView;
  busy: boolean;
}

// Контейнер-обстановка на карте (docs/plan/blocks.md, этап 11): своё название,
// содержимое по вместимости записи, замок и «Заперт». У двери с положениями «Заперта»
// уже есть рядом с положением — второй переключатель не нужен.
function FurnitureContainerProps({ tool, object, view, refs, busy }: Props) {
  if (view?.missing !== null || !view.container) return null;
  const { capacity, lockDc } = view.container;
  const name = object.name ?? view.name;
  return (
    <Stack gap="sm">
      <NameInput
        key={name}
        value={name}
        onCommit={(next) => tool.update({ name: next })}
        disabled={busy}
      />
      <Text size="xs" c="dimmed">
        Замок: {lockDc === null ? 'нет' : LOCK_DC_LABELS[lockDc]}
      </Text>
      {view.positions.length < 2 && (
        <Switch
          size="sm"
          label="Заперт"
          checked={object.locked ?? false}
          onChange={(e) => tool.update({ locked: e.currentTarget.checked })}
          disabled={busy}
        />
      )}
      <ContainerItems
        items={object.items ?? []}
        capacity={capacity}
        refs={refs.items}
        onChange={(items) => tool.update({ items })}
        disabled={busy}
      />
    </Stack>
  );
}

export default FurnitureContainerProps;
