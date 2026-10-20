import {
  Alert,
  Button,
  Group,
  Stack,
  Switch,
  Text,
  Title,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useState } from 'react';
import type { GameScenes as GameScenesState } from 'shared';
import {
  activateGameScene,
  addGameScene,
  restartGameScene,
  scenePagePath,
  setGameSceneOpen,
} from '../../../features/games';
import AddSceneModal from './AddSceneModal';
import SceneRow from './SceneRow';
import { useGameScenes } from './useGameScenes';

interface GameScenesProps {
  gameId: string;
  // Растёт, когда сцены поменялись (событие по сокету): блок перечитывает себя.
  version: number;
  // Сцены поменялись нашей правкой — лобби перечитывает свою активную сцену.
  onChanged: () => void;
}

// Блок «Сцены» в лобби мастера (docs/plan/game.md, этап 5): переключатель «Открыта
// игрокам», список сцен с активной и «Добавить сцену».
function GameScenes({ gameId, version, onChanged }: GameScenesProps) {
  const { scenes, error, busy, run } = useGameScenes(gameId, version);
  const [adding, setAdding] = useState(false);
  const hasActive = scenes?.scenes.some((scene) => scene.active) ?? false;
  const open = scenes?.open ?? false;

  const act = (action: () => Promise<GameScenesState>, failure: string) =>
    run(action, failure).then((done) => {
      if (done) onChanged();
      return done;
    });

  const handleRestart = (sceneId: string, name: string) => {
    if (
      !window.confirm(
        `Перезапустить сцену «${name}»? Всё, что случилось на ней в игре, пропадёт: сцена снова станет копией карты.`,
      )
    )
      return;
    void act(
      () => restartGameScene(gameId, sceneId),
      'Не удалось перезапустить сцену',
    );
  };

  return (
    <Stack gap="sm">
      <Group justify="space-between" align="center">
        <Title order={2} size="h3">
          Сцены
        </Title>
        <Group gap="md">
          <Switch
            label="Открыта игрокам"
            checked={open}
            disabled={busy || (!open && !hasActive)}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              void act(
                () => setGameSceneOpen(gameId, next),
                next ? 'Не удалось открыть сцену' : 'Не удалось закрыть сцену',
              );
            }}
          />
          <Button
            variant="default"
            leftSection={<IconPlus size={16} />}
            disabled={busy}
            onClick={() => setAdding(true)}
          >
            Добавить сцену
          </Button>
        </Group>
      </Group>
      {scenes && scenes.scenes.length > 0 && (
        <Text size="sm" c="dimmed">
          {open
            ? 'Игроки видят активную сцену.'
            : 'Игроки ждут в лобби: активная сцена им не видна.'}
        </Text>
      )}
      {error && !adding && <Alert color="red">{error}</Alert>}
      {scenes?.scenes.length === 0 && (
        <Text size="sm" c="dimmed">
          Сцен пока нет. Добавьте сцену из своей карты — игроки увидят её, когда
          вы её откроете.
        </Text>
      )}
      {scenes?.scenes.map((scene) => (
        <SceneRow
          key={scene.id}
          scene={scene}
          scenePath={scenePagePath(gameId)}
          busy={busy}
          onActivate={() =>
            void act(
              () => activateGameScene(gameId, scene.id),
              'Не удалось сменить активную сцену',
            )
          }
          onRestart={() => handleRestart(scene.id, scene.name)}
        />
      ))}
      <AddSceneModal
        opened={adding}
        busy={busy}
        addError={error}
        onClose={() => setAdding(false)}
        onAdd={(mapId) =>
          act(() => addGameScene(gameId, mapId), 'Не удалось добавить сцену')
        }
      />
    </Stack>
  );
}

export default GameScenes;
