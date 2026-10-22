import { Alert, Card, Stack } from '@mantine/core';
import { useSettingsChange } from '../useSettingsChange';
import GraphicsQualityField from './GraphicsQualityField';

// Раздел «Графика»: качество графики (позже — и как рисовать тяжёлые 3D-модели,
// docs/plan/character-models.md, этап 5).
function GraphicsSection() {
  const { settings, saving, error, change } = useSettingsChange();
  if (!settings) return null;
  return (
    <Stack>
      <Card withBorder padding="lg" radius="md">
        <GraphicsQualityField
          value={settings.graphicsQuality}
          disabled={saving}
          onChange={(graphicsQuality) => change({ graphicsQuality })}
        />
      </Card>
      {error && <Alert color="red">{error}</Alert>}
    </Stack>
  );
}

export default GraphicsSection;
