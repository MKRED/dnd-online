import { Group, Radio, SimpleGrid, Stack, Text } from '@mantine/core';
import { HEALTH_MARK_STYLES, type HealthMarkStyle } from 'shared';
import HealthMarkPreview from './HealthMarkPreview';
import { FIELD_HEADING_STYLES } from '../fieldHeading';

const STYLE_TEXT: Record<HealthMarkStyle, { label: string; hint: string }> = {
  plate: { label: 'Табличка', hint: 'Тёмная, с рамкой цвета состояния' },
  text: { label: 'Надпись', hint: 'Только текст с обводкой' },
  ribbon: { label: 'Лента', hint: 'Лента с вырезами на концах' },
};

interface HealthMarkStyleFieldProps {
  value: HealthMarkStyle;
  disabled: boolean;
  onChange: (value: HealthMarkStyle) => void;
}

// Вид метки здоровья над существом в игре: превью рисует тот же код, что и сцена.
function HealthMarkStyleField({
  value,
  disabled,
  onChange,
}: HealthMarkStyleFieldProps) {
  return (
    <Radio.Group
      label="Метка здоровья"
      styles={FIELD_HEADING_STYLES}
      description="Как в игре подписаны раненые и поверженные существа"
      value={value}
      onChange={onChange}
    >
      <SimpleGrid cols={{ base: 1, xs: 3 }} mt="xs">
        {HEALTH_MARK_STYLES.map((style) => (
          <Radio.Card
            key={style}
            value={style}
            disabled={disabled}
            radius="md"
            p="sm"
          >
            <Stack gap={6}>
              <HealthMarkPreview style={style} />
              <Group gap={6} wrap="nowrap">
                <Radio.Indicator size="xs" />
                <Text fw={500}>{STYLE_TEXT[style].label}</Text>
              </Group>
              <Text size="xs" c="dimmed">
                {STYLE_TEXT[style].hint}
              </Text>
            </Stack>
          </Radio.Card>
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}

export default HealthMarkStyleField;
