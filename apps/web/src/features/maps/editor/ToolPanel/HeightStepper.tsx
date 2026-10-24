import { ActionIcon, Group, NumberInput, Stack, Text } from '@mantine/core';
import { IconMinus, IconPlus } from '@tabler/icons-react';
import SectionLabel from './SectionLabel';

const MIN = 1;
const MAX = 64;

// Высота области кнопками − и + (макет «П6», docs/plan/done/scene-page.md, этап 3): чаще всего
// её меняют на слой-два, и щёлкать удобнее, чем целиться в стрелки поля.
function HeightStepper({
  value,
  onChange,
}: {
  value: number;
  onChange: (height: number) => void;
}) {
  const set = (next: number) => onChange(Math.min(MAX, Math.max(MIN, next)));
  return (
    <Stack gap={6}>
      <SectionLabel title="Высота" />
      <Group gap="sm" wrap="nowrap">
        <Group gap={0} wrap="nowrap">
          <ActionIcon
            variant="default"
            size={36}
            aria-label="Высота меньше на слой"
            disabled={value <= MIN}
            onClick={() => set(value - 1)}
            style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0 }}
          >
            <IconMinus size={16} />
          </ActionIcon>
          <NumberInput
            aria-label="Высота области"
            hideControls
            min={MIN}
            max={MAX}
            w={52}
            size="sm"
            value={value}
            onChange={(next) => set(Number(next) || MIN)}
            styles={{
              input: { textAlign: 'center', borderRadius: 0, height: 36 },
            }}
          />
          <ActionIcon
            variant="default"
            size={36}
            aria-label="Высота больше на слой"
            disabled={value >= MAX}
            onClick={() => set(value + 1)}
            style={{ borderTopLeftRadius: 0, borderBottomLeftRadius: 0 }}
          >
            <IconPlus size={16} />
          </ActionIcon>
        </Group>
        <Text size="xs" c="dimmed">
          Слоёв над верхним углом, включая его
        </Text>
      </Group>
    </Stack>
  );
}

export default HeightStepper;
