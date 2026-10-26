import { Stack, Switch, Text } from '@mantine/core';
import type { SceneFogControls } from './useSceneFog';

// «Глазами игроков» (docs/plan/done/fog-of-war.md, этап 6) — в группе «Игроки» вкладки
// «Сцена»: это про то, что видят игроки, а работает только при тумане.
function PlayersEyesSwitch({ fog }: { fog: SceneFogControls }) {
  return (
    <Stack gap={4}>
      <Switch
        label="Глазами игроков"
        checked={fog.eyes}
        disabled={!fog.fogOn}
        onChange={(e) => fog.setEyes(e.currentTarget.checked)}
      />
      <Text size="xs" c="dimmed">
        {fog.fogOn
          ? 'Сцена, как её сейчас видят игроки. Править в этом режиме нельзя.'
          : 'Доступно, когда включён туман войны.'}
      </Text>
    </Stack>
  );
}

export default PlayersEyesSwitch;
