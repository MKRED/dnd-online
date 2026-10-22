import { Alert, Card, Stack, Text, Title } from '@mantine/core';
import {
  GRAPHICS_PRESET_VALUES,
  type GraphicsPreset,
  type GraphicsSettings,
} from 'shared';
import { useSettingsChange } from '../useSettingsChange';
import GraphicsOptions from './GraphicsOptions';
import GraphicsPresetField from './GraphicsPresetField';

// Раздел «Графика»: набор и настройки по одной (решено с пользователем 2026-10-23).
// Значения уходят на сервер всегда целиком, вместе с набором: «Своё» начинается с того,
// что было видно, а у набора сервер всё равно берёт его значения (readUserSettings).
function GraphicsSection() {
  const { settings, saving, error, change } = useSettingsChange();
  if (!settings) return null;
  const current: GraphicsSettings = {
    animationFps: settings.animationFps,
    creatureModels: settings.creatureModels,
    renderScale: settings.renderScale,
    antialias: settings.antialias,
    frameLimit: settings.frameLimit,
  };

  const choosePreset = (graphicsPreset: GraphicsPreset) =>
    change({
      graphicsPreset,
      ...(graphicsPreset === 'custom'
        ? current
        : GRAPHICS_PRESET_VALUES[graphicsPreset]),
    });
  const changeOption = (patch: Partial<GraphicsSettings>) =>
    change({ graphicsPreset: 'custom', ...current, ...patch });

  return (
    <Stack>
      <Card withBorder padding="lg" radius="md">
        <GraphicsPresetField
          value={settings.graphicsPreset}
          disabled={saving}
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
          disabled={saving}
          onChange={changeOption}
        />
      </Card>
      {error && <Alert color="red">{error}</Alert>}
    </Stack>
  );
}

export default GraphicsSection;
