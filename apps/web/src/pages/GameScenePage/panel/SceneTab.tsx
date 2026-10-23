import { Alert, Stack, Switch, Text } from '@mantine/core';
import type { GameSceneStatus } from 'shared';
import { FogPanel, type SceneFogControls } from '../fog';

interface SceneTabProps {
  scene: GameSceneStatus;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  fog: SceneFogControls;
}

// Вкладка «Сцена» у мастера (docs/plan/scene-page.md, этап 2): открыта ли игрокам, туман
// войны и «Глазами игроков» — всё, что про сцену целиком, а не про участников.
function SceneTab({ scene, busy, error, onOpenChange, fog }: SceneTabProps) {
  return (
    <Stack gap="lg">
      <Stack gap={4}>
        <Switch
          label="Открыта игрокам"
          checked={scene.open}
          disabled={busy}
          onChange={(e) => onOpenChange(e.currentTarget.checked)}
        />
        <Text size="xs" c="dimmed">
          {scene.open
            ? 'Игроки видят сцену и каждую правку сразу. Закроете — их переведёт в лобби.'
            : 'Игроки ждут в лобби. Откроете — их переведёт сюда.'}
        </Text>
        {error && <Alert color="red">{error}</Alert>}
      </Stack>
      <FogPanel fog={fog} />
    </Stack>
  );
}

export default SceneTab;
