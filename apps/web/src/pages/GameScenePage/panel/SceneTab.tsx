import { Alert, Stack, Switch, Text } from '@mantine/core';
import type { ReactNode } from 'react';
import type { GameSceneStatus } from 'shared';
import { FogPanel, PlayersEyesSwitch, type SceneFogControls } from '../fog';
import SceneGroup from './SceneGroup';
import ServiceSection from './ServiceSection';

interface SceneTabProps {
  scene: GameSceneStatus;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  fog: SceneFogControls;
  // Группа «Бой» (combat/CombatControls); null — фигурки ещё не загружены.
  combat: ReactNode;
  fighting: boolean;
  // «Игроки могут ходить» с героями (MoveLockSwitches); null — фигурок нет.
  moveLock?: ReactNode;
}

// Вкладка «Сцена» у мастера (docs/plan/done/scene-page.md, этап 2): всё, что про сцену
// целиком, а не про участников. После первой партии (2026-10-26, вариант Б) — по группам:
// Бой первым (его жмут каждый раунд), Игроки, Туман войны и свёрнутое «Служебное».
function SceneTab({
  scene,
  busy,
  error,
  onOpenChange,
  fog,
  combat,
  fighting,
  moveLock = null,
}: SceneTabProps) {
  return (
    <Stack gap="sm">
      {combat && (
        <SceneGroup title="Бой" hot={fighting}>
          {combat}
        </SceneGroup>
      )}
      <SceneGroup title="Игроки">
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
        {moveLock}
        <PlayersEyesSwitch fog={fog} />
      </SceneGroup>
      <SceneGroup title="Туман войны">
        <FogPanel fog={fog} />
      </SceneGroup>
      <ServiceSection fog={fog} />
    </Stack>
  );
}

export default SceneTab;
