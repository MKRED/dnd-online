import { Group, Radio, SimpleGrid, Stack, Text } from '@mantine/core';
import {
  AVAILABLE_GRAPHICS_QUALITIES,
  GRAPHICS_QUALITIES,
  type GraphicsQuality,
} from 'shared';
import { FIELD_HEADING_STYLES } from '../fieldHeading';

const QUALITY_TEXT: Record<GraphicsQuality, { label: string; hint: string }> = {
  low: { label: 'Низкое', hint: 'Без анимаций — для слабых устройств' },
  medium: { label: 'Среднее', hint: 'С анимациями' },
  high: { label: 'Высокое', hint: 'Скоро: частицы и эффекты' },
};

interface GraphicsQualityFieldProps {
  value: GraphicsQuality;
  disabled: boolean;
  onChange: (value: GraphicsQuality) => void;
}

// Качество графики на карте. «Высокое» видно заранее, но выбрать его пока нельзя.
function GraphicsQualityField({
  value,
  disabled,
  onChange,
}: GraphicsQualityFieldProps) {
  return (
    <Radio.Group
      label="Качество графики"
      styles={FIELD_HEADING_STYLES}
      description="Как подробно рисуется карта и сцена игры"
      value={value}
      onChange={onChange}
    >
      <SimpleGrid cols={{ base: 1, xs: 3 }} mt="xs">
        {GRAPHICS_QUALITIES.map((quality) => (
          <Radio.Card
            key={quality}
            value={quality}
            disabled={
              disabled || !AVAILABLE_GRAPHICS_QUALITIES.includes(quality)
            }
            radius="md"
            p="sm"
          >
            <Stack gap={2}>
              <Group gap={6} wrap="nowrap">
                <Radio.Indicator size="xs" />
                <Text fw={500}>{QUALITY_TEXT[quality].label}</Text>
              </Group>
              <Text size="xs" c="dimmed">
                {QUALITY_TEXT[quality].hint}
              </Text>
            </Stack>
          </Radio.Card>
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}

export default GraphicsQualityField;
