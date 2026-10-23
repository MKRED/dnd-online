import {
  Button,
  Group,
  SegmentedControl,
  Select,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import {
  CONTAINER_CAPACITY,
  CONTAINER_LOOK_LABELS,
  CONTAINER_LOOKS,
  CREATURE_SIZES,
  objectFacing,
  type CreatureSize,
  type MapObject,
  type MapObjectRefsView,
  type MapObjectSummary,
} from 'shared';
import { NameInput, QuantityInput } from './CommitInputs';
import ContainerItems from './ContainerItems';
import FacingPicker from './FacingPicker';
import FurniturePositions from './FurniturePositions';
import type { ObjectTool } from './useObjectTool';

const SIZE_OPTIONS = Object.entries(CREATURE_SIZES).map(([value, size]) => ({
  value,
  label: size.label,
}));

const LOOK_OPTIONS = CONTAINER_LOOKS.map((look) => ({
  value: look,
  label: CONTAINER_LOOK_LABELS[look],
}));

interface ObjectPropertiesProps {
  tool: ObjectTool;
  object: MapObject;
  summary: MapObjectSummary | undefined;
  refs: MapObjectRefsView;
  busy: boolean;
}

// Свойства выделенного объекта. Каждое изменение — своя операция журнала
// (turnObject, updateObject, setPosition), поэтому отменяется по одному.
function ObjectProperties({
  tool,
  object,
  summary,
  refs,
  busy,
}: ObjectPropertiesProps) {
  const facing = objectFacing(object);
  return (
    <Stack gap="sm">
      <div>
        <Text fw={600}>
          {summary?.label ?? 'Объект'}{' '}
          <Text span c="dimmed" size="sm">
            №{object.id}
          </Text>
        </Text>
        {summary?.warnings.map((warning) => (
          <Text key={warning} size="xs" c="orange">
            {warning}
          </Text>
        ))}
      </div>

      {/* Первым из свойств: в игре это самая частая правка — вывести засаду. */}
      <Stack gap={2}>
        <Switch
          size="sm"
          label="Скрыт от игроков"
          checked={object.hidden}
          onChange={(e) => tool.update({ hidden: e.currentTarget.checked })}
          disabled={busy}
        />
        {object.hidden && (
          <Text size="xs" c="dimmed">
            Видите только вы. Снимите — игроки увидят его сразу.
          </Text>
        )}
      </Stack>

      {object.kind === 'furniture' && (
        <FurniturePositions
          tool={tool}
          object={object}
          view={refs.furniture[object.furnitureId]}
          busy={busy}
        />
      )}

      {facing !== null && (
        <FacingPicker
          value={facing}
          onChange={tool.turn}
          disabled={busy}
          rightOnly={object.kind === 'furniture'}
        />
      )}

      {object.kind === 'npc' && (
        <Select
          size="xs"
          label="Размер"
          data={SIZE_OPTIONS}
          value={object.size}
          onChange={(size) =>
            size && tool.update({ size: size as CreatureSize })
          }
          allowDeselect={false}
          disabled={busy}
        />
      )}

      {object.kind === 'container' && (
        <>
          <NameInput
            key={object.name}
            value={object.name}
            onCommit={(name) => tool.update({ name })}
            disabled={busy}
          />
          <SegmentedControl
            size="xs"
            data={LOOK_OPTIONS}
            value={object.look}
            onChange={(look) => tool.update({ look: look })}
            disabled={busy}
          />
          <ContainerItems
            items={object.items}
            capacity={CONTAINER_CAPACITY[object.look]}
            refs={refs.items}
            onChange={(items) => tool.update({ items })}
            disabled={busy}
          />
        </>
      )}

      {object.kind === 'item' && (
        <QuantityInput
          key={object.quantity}
          label="Количество"
          value={object.quantity}
          w={120}
          onCommit={(quantity) => tool.update({ quantity })}
          disabled={busy}
        />
      )}

      {/* Отмена переноса — кнопкой под свойствами (ObjectsPanel) и Esc. */}
      {tool.moving ? (
        <Text size="sm" c="blue" role="status">
          Кликните клетку, куда перенести.
        </Text>
      ) : (
        <Group gap="xs" grow>
          <Button
            size="xs"
            variant="default"
            onClick={() => tool.setMoving(true)}
            disabled={busy}
          >
            Перенести
          </Button>
          <Button
            size="xs"
            color="red"
            variant="light"
            onClick={tool.remove}
            disabled={busy}
          >
            Удалить (Del)
          </Button>
        </Group>
      )}
    </Stack>
  );
}

export default ObjectProperties;
