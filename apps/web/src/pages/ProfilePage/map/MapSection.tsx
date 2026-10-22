import { Alert, Card, Stack } from '@mantine/core';
import { useSettingsChange } from '../useSettingsChange';
import FacingMarkerField from './FacingMarkerField';
import HealthMarkStyleField from './HealthMarkStyleField';

// Раздел «Карта и игра»: как на карте и сцене показаны взгляд и здоровье существ.
function MapSection() {
  const { settings, saving, error, change } = useSettingsChange();
  if (!settings) return null;
  return (
    <Stack>
      <Card withBorder padding="lg" radius="md">
        <FacingMarkerField
          value={settings.facingMarker}
          disabled={saving}
          onChange={(facingMarker) => change({ facingMarker })}
        />
      </Card>
      <Card withBorder padding="lg" radius="md">
        <HealthMarkStyleField
          value={settings.healthMarkStyle}
          disabled={saving}
          onChange={(healthMarkStyle) => change({ healthMarkStyle })}
        />
      </Card>
      {error && <Alert color="red">{error}</Alert>}
    </Stack>
  );
}

export default MapSection;
