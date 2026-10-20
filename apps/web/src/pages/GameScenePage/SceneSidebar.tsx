import {
  Alert,
  Anchor,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { Link } from 'react-router-dom';
import type { GameSceneStatus } from 'shared';
import classes from './GameScenePage.module.css';

interface SceneSidebarProps {
  gameId: string;
  gameName: string;
  // null — сцена ещё не загружена или её нет.
  scene: GameSceneStatus | null;
  master: boolean;
  busy: boolean;
  error: string | null;
  onOpenChange: (open: boolean) => void;
  // Пределы и значение среза по высоте; null — сцена пустая или не загружена.
  cut: { min: number; max: number; value: number } | null;
  onCutChange: (y: number) => void;
}

// Панель страницы сцены: где мы, дорога в лобби, у мастера — «Открыта игрокам», и срез
// по высоте, как в редакторе карты.
function SceneSidebar({
  gameId,
  gameName,
  scene,
  master,
  busy,
  error,
  onOpenChange,
  cut,
  onCutChange,
}: SceneSidebarProps) {
  return (
    <aside className={classes.sidebar}>
      <Stack gap="md">
        <div>
          <Anchor
            component={Link}
            to={`/games/${gameId}`}
            size="sm"
            display="block"
          >
            ← В лобби
          </Anchor>
          <Title order={3} mt={4} style={{ overflowWrap: 'anywhere' }}>
            {scene?.name ?? 'Сцена'}
          </Title>
          <Text size="sm" c="dimmed" style={{ overflowWrap: 'anywhere' }}>
            {gameName}
          </Text>
        </div>

        {master && scene && (
          <Stack gap={4}>
            <Switch
              label="Открыта игрокам"
              checked={scene.open}
              disabled={busy}
              onChange={(e) => onOpenChange(e.currentTarget.checked)}
            />
            <Text size="xs" c="dimmed">
              {scene.open
                ? 'Игроки видят эту сцену. Закроете — их переведёт в лобби.'
                : 'Игроки ждут в лобби. Откроете — их переведёт сюда.'}
            </Text>
          </Stack>
        )}
        {error && <Alert color="red">{error}</Alert>}

        {cut && (
          <Stack gap={4}>
            <Text size="sm">Срез по высоте: {cut.value}</Text>
            <Slider
              min={cut.min}
              max={cut.max}
              value={cut.value}
              onChange={onCutChange}
              label={null}
              thumbLabel="Срез по высоте"
            />
          </Stack>
        )}
      </Stack>
    </aside>
  );
}

export default SceneSidebar;
