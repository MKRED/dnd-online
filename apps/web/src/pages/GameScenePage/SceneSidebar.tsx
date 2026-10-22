import { Alert, Anchor, Stack, Switch, Text, Title } from '@mantine/core';
import type { ReactNode } from 'react';
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
  // Инструменты мастера (этап 6); у игрока их нет.
  children?: ReactNode;
}

// Панель страницы сцены: где мы, дорога в лобби, у мастера — «Открыта игрокам» и свойства
// инструмента. Срез по высоте — на сцене (CutRuler), как в редакторе карты.
function SceneSidebar({
  gameId,
  gameName,
  scene,
  master,
  busy,
  error,
  onOpenChange,
  children,
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
                ? 'Игроки видят эту сцену и каждую правку сразу. Закроете — их переведёт в лобби.'
                : 'Игроки ждут в лобби. Откроете — их переведёт сюда.'}
            </Text>
          </Stack>
        )}
        {error && <Alert color="red">{error}</Alert>}

        {children}
      </Stack>
    </aside>
  );
}

export default SceneSidebar;
