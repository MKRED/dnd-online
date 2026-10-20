import { Checkbox, SegmentedControl, Stack, Text } from '@mantine/core';
import { CONTAINER_LOOK_LABELS, CONTAINER_LOOKS } from 'shared';
import CatalogSelect from './CatalogSelect';
import FacingPicker from './FacingPicker';
import { PLACE_KIND_LABELS, type PlaceKind } from './objectPlacement';
import type { ObjectTool } from './useObjectTool';

const KIND_OPTIONS = (Object.keys(PLACE_KIND_LABELS) as PlaceKind[]).map(
  (kind) => ({ value: kind, label: PLACE_KIND_LABELS[kind] }),
);

const LOOK_OPTIONS = CONTAINER_LOOKS.map((look) => ({
  value: look,
  label: CONTAINER_LOOK_LABELS[look],
}));

// Что ставит клик по клетке: вид, запись каталога, вид контейнера и взгляд.
function PlaceSection({ tool }: { tool: ObjectTool }) {
  const { settings, missingChoice } = tool;
  const { kind } = settings;
  const required = missingChoice ? 'Выберите, что ставить' : null;

  return (
    <Stack gap="sm">
      <Stack gap={4}>
        <Text size="sm">Ставить</Text>
        <SegmentedControl
          size="xs"
          data={KIND_OPTIONS}
          value={kind}
          onChange={(value) => tool.setKind(value)}
          fullWidth
        />
      </Stack>

      {kind === 'creature' && (
        <CatalogSelect
          kinds={['monster', 'npc']}
          value={settings.creature}
          onChange={tool.setCreature}
          label="Существо"
          placeholder="Монстр или свой НПС"
          error={required}
        />
      )}
      {kind === 'item' && (
        <CatalogSelect
          kinds={['item']}
          value={settings.item}
          onChange={tool.setItem}
          label="Предмет"
          placeholder="Найти по названию"
          error={required}
        />
      )}
      {kind === 'container' && (
        <SegmentedControl
          size="xs"
          data={LOOK_OPTIONS}
          value={settings.look}
          onChange={(look) => tool.setLook(look)}
          fullWidth
        />
      )}
      {kind !== 'item' && (
        <FacingPicker value={settings.facing} onChange={tool.setFacing} />
      )}
      {/* Засаду ставят сразу скрытой: в открытой сцене объект, спрятанный после
          постановки, игроки успели бы увидеть. */}
      <Checkbox
        size="xs"
        label="Ставить скрытым от игроков"
        description="Снять скрытие — в свойствах объекта"
        checked={settings.hidden}
        onChange={(e) => tool.setHidden(e.currentTarget.checked)}
      />
    </Stack>
  );
}

export default PlaceSection;
