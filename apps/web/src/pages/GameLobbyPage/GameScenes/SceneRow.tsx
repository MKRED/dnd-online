import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Menu,
  Paper,
  Text,
} from '@mantine/core';
import { IconDots } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { GameScene } from 'shared';

interface SceneRowProps {
  scene: GameScene;
  scenePath: string;
  busy: boolean;
  onActivate: () => void;
  onRestart: () => void;
}

// Сцена в блоке мастера. У активной — переход на страницу сцены (мастеру она открыта
// всегда), у остальных — «Сделать активной». Перезапуск — в меню: он редкий и стирает
// всё, что случилось на сцене.
function SceneRow({
  scene,
  scenePath,
  busy,
  onActivate,
  onRestart,
}: SceneRowProps) {
  return (
    <Paper withBorder p="sm">
      <Group justify="space-between" wrap="nowrap" gap="xs">
        <Group gap="xs" style={{ minWidth: 0 }}>
          <Text fw={500} style={{ overflowWrap: 'anywhere' }}>
            {scene.name}
          </Text>
          {scene.active && (
            <Badge color="green" variant="light">
              Активная
            </Badge>
          )}
        </Group>
        <Group gap="xs" wrap="nowrap">
          {scene.active ? (
            <Button size="xs" component={Link} to={scenePath}>
              К сцене
            </Button>
          ) : (
            <Button
              size="xs"
              variant="default"
              disabled={busy}
              onClick={onActivate}
            >
              Сделать активной
            </Button>
          )}
          <Menu position="bottom-end">
            <Menu.Target>
              <ActionIcon
                variant="subtle"
                aria-label={`Ещё: ${scene.name}`}
                disabled={busy}
              >
                <IconDots size={16} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item disabled={scene.mapId === null} onClick={onRestart}>
                Перезапустить
              </Menu.Item>
              {scene.mapId === null && (
                <Menu.Label>Карту сцены удалили</Menu.Label>
              )}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </Group>
    </Paper>
  );
}

export default SceneRow;
