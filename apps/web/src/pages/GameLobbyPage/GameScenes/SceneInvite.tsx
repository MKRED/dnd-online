import { Button, Group, Paper, Text } from '@mantine/core';
import { IconMap } from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import type { GameSceneStatus } from 'shared';
import { scenePagePath } from '../../../features/games';

interface SceneInviteProps {
  gameId: string;
  scene: GameSceneStatus;
}

// Открытая сцена в лобби игрока: зайти на неё можно в любой момент. Само открытие
// переводит игроков туда сразу (LobbyView).
function SceneInvite({ gameId, scene }: SceneInviteProps) {
  return (
    <Paper withBorder p="md">
      <Group justify="space-between" gap="sm">
        <Text style={{ overflowWrap: 'anywhere' }}>
          Мастер открыл сцену «{scene.name}»
        </Text>
        <Button
          component={Link}
          to={scenePagePath(gameId)}
          leftSection={<IconMap size={16} />}
        >
          К сцене
        </Button>
      </Group>
    </Paper>
  );
}

export default SceneInvite;
