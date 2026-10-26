import { Badge, Card, Group, Stack, Text, Title } from '@mantine/core';
import {
  GRAPHICS_PRESET_VALUES,
  type GraphicsPreset,
  type GraphicsSettings,
} from 'shared';
import {
  saveDeviceGraphics,
  useDeviceGraphics,
} from '../../../features/profile';
import GraphicsOptions from './GraphicsOptions';
import GraphicsPresetField from './GraphicsPresetField';

// Раздел «Графика»: набор и настройки по одной (решено с пользователем 2026-10-23). После
// первой партии (2026-10-26, вариант А) — только для этого устройства: хранятся в браузере
// и на сервер не уходят, так что телефон и компьютер настраиваются отдельно. Сохраняется
// всегда целиком, вместе с набором: «Своё» начинается с того, что было видно.
function GraphicsSection() {
  const { graphicsPreset, ...current } = useDeviceGraphics();
  const choosePreset = (preset: GraphicsPreset) =>
    saveDeviceGraphics({
      graphicsPreset: preset,
      ...(preset === 'custom' ? current : GRAPHICS_PRESET_VALUES[preset]),
    });
  const changeOption = (patch: Partial<GraphicsSettings>) =>
    saveDeviceGraphics({ graphicsPreset: 'custom', ...current, ...patch });

  return (
    <Stack>
      <Card withBorder padding="lg" radius="md">
        <Group gap="xs" mb={4}>
          <Badge variant="light" size="sm">
            Это устройство
          </Badge>
        </Group>
        <Text size="sm" c="dimmed" mb="md">
          Настройки хранятся в этом браузере. На телефоне и компьютере они свои.
        </Text>
        <GraphicsPresetField
          value={graphicsPreset}
          disabled={false}
          onChange={choosePreset}
        />
      </Card>
      <Card withBorder padding="lg" radius="md">
        <Title order={4}>Настройки по одной</Title>
        <Text size="sm" c="dimmed" mb="lg">
          Любое изменение здесь переключает набор на «Своё». Действуют на карте
          и сцене игры.
        </Text>
        <GraphicsOptions
          value={current}
          disabled={false}
          onChange={changeOption}
        />
      </Card>
    </Stack>
  );
}

export default GraphicsSection;
