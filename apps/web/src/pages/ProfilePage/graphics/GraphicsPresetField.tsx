import { Group, Radio, SimpleGrid, Stack, Text } from '@mantine/core';
import {
  AVAILABLE_GRAPHICS_PRESETS,
  GRAPHICS_PRESETS,
  type GraphicsPreset,
} from 'shared';
import { FIELD_HEADING_STYLES } from '../fieldHeading';

const PRESET_TEXT: Record<GraphicsPreset, { label: string; hint: string }> = {
  low: {
    label: 'Низкое',
    hint: 'Карточки, без анимаций — для слабых устройств',
  },
  medium: { label: 'Среднее', hint: 'Модели и анимации' },
  high: { label: 'Высокое', hint: 'Скоро: частицы и эффекты' },
  custom: { label: 'Своё', hint: 'Настройки ниже по одной' },
};

interface GraphicsPresetFieldProps {
  value: GraphicsPreset;
  disabled: boolean;
  onChange: (value: GraphicsPreset) => void;
}

// Набор графики: задаёт все настройки ниже сразу. «Высокое» видно заранее, но выбрать
// его пока нельзя.
function GraphicsPresetField({
  value,
  disabled,
  onChange,
}: GraphicsPresetFieldProps) {
  return (
    <Radio.Group
      label="Качество графики"
      styles={FIELD_HEADING_STYLES}
      description="Набор задаёт все настройки ниже сразу"
      value={value}
      onChange={onChange}
    >
      <SimpleGrid cols={{ base: 2, sm: 4 }} mt="xs">
        {GRAPHICS_PRESETS.map((preset) => (
          <Radio.Card
            key={preset}
            value={preset}
            disabled={disabled || !AVAILABLE_GRAPHICS_PRESETS.includes(preset)}
            radius="md"
            p="sm"
          >
            <Stack gap={2}>
              <Group gap={6} wrap="nowrap">
                <Radio.Indicator size="xs" />
                <Text fw={500}>{PRESET_TEXT[preset].label}</Text>
              </Group>
              <Text size="xs" c="dimmed">
                {PRESET_TEXT[preset].hint}
              </Text>
            </Stack>
          </Radio.Card>
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}

export default GraphicsPresetField;
