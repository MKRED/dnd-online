import { Group, Radio, SimpleGrid, Stack, Text } from '@mantine/core';
import { FACING_MARKERS, type FacingMarker } from 'shared';
import FacingMarkerPreview from './FacingMarkerPreview';
import { FIELD_HEADING_STYLES } from '../fieldHeading';

const MARKER_TEXT: Record<FacingMarker, { label: string; hint: string }> = {
  pointer: { label: 'Указатель', hint: 'Подставка вытянута носом по взгляду' },
  chevrons: { label: 'Шевроны', hint: 'Два шеврона у края подставки' },
  compass: { label: 'Компас', hint: 'Кольцо с засечками и стрелкой' },
};

interface FacingMarkerFieldProps {
  value: FacingMarker;
  disabled: boolean;
  onChange: (value: FacingMarker) => void;
}

// Как подставки стартов и существ показывают взгляд; превью рядом с каждым видом.
function FacingMarkerField({
  value,
  disabled,
  onChange,
}: FacingMarkerFieldProps) {
  return (
    <Radio.Group
      label="Взгляд на карте"
      styles={FIELD_HEADING_STYLES}
      description="Как подставки стартов и существ показывают, куда они смотрят"
      value={value}
      onChange={onChange}
    >
      <SimpleGrid cols={{ base: 1, xs: 3 }} mt="xs">
        {FACING_MARKERS.map((marker) => (
          <Radio.Card
            key={marker}
            value={marker}
            disabled={disabled}
            radius="md"
            p="sm"
          >
            <Group wrap="nowrap" gap="sm">
              <FacingMarkerPreview marker={marker} />
              <Stack gap={2}>
                <Group gap={6} wrap="nowrap">
                  <Radio.Indicator size="xs" />
                  <Text fw={500}>{MARKER_TEXT[marker].label}</Text>
                </Group>
                <Text size="xs" c="dimmed">
                  {MARKER_TEXT[marker].hint}
                </Text>
              </Stack>
            </Group>
          </Radio.Card>
        ))}
      </SimpleGrid>
    </Radio.Group>
  );
}

export default FacingMarkerField;
