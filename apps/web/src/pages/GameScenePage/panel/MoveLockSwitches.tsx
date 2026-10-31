import { Group, Stack, Switch, Text } from '@mantine/core';
import type { GameFigure } from 'shared';
import { figureImagePath } from '../../../features/games';
import Portrait from '../participants/Portrait';
import classes from './ScenePanel.module.css';

interface MoveLockSwitchesProps {
  gameId: string;
  // Герои на сцене.
  heroes: readonly GameFigure[];
  busy: boolean;
  // characterId null — всем сразу.
  onLock: (characterId: string | null, locked: boolean) => void;
}

// «Игроки могут ходить» в группе «Игроки» (макет «Запрет ходить игрокам», вариант А,
// 2026-10-31): общий переключатель включает или выключает всех, под ним — по герою.
// Запрет держит фигурку на месте у игрока, мастер водит её как обычно.
function MoveLockSwitches({
  gameId,
  heroes,
  busy,
  onLock,
}: MoveLockSwitchesProps) {
  if (heroes.length === 0) return null;
  const stopped = heroes.filter((f) => f.moveLocked).length;
  const mixed = stopped > 0 && stopped < heroes.length;
  return (
    <Stack gap={6}>
      <Group gap="xs" wrap="nowrap" justify="space-between">
        <Switch
          label="Игроки могут ходить"
          checked={stopped === 0}
          disabled={busy}
          // Включён, только когда ходят все: из «стоит кто-то» щелчок разрешает всем.
          onChange={(e) => onLock(null, !e.currentTarget.checked)}
        />
        {stopped > 0 && (
          <Text size="xs" c="orange" style={{ flex: 'none' }}>
            {mixed ? `стоит ${stopped} из ${heroes.length}` : 'все стоят'}
          </Text>
        )}
      </Group>
      <Stack gap={4} className={classes.lockList}>
        {heroes.map((hero) => (
          <Group key={hero.character.id} gap={8} wrap="nowrap">
            <Portrait
              image={figureImagePath(gameId, hero)}
              name={hero.character.name}
              kind="pc"
              size={22}
            />
            <Text size="sm" truncate style={{ flex: 1, minWidth: 0 }}>
              {hero.character.name}
            </Text>
            {hero.moveLocked && (
              <Text size="xs" c="orange">
                стоит
              </Text>
            )}
            <Switch
              size="xs"
              aria-label={`${hero.character.name} может ходить`}
              checked={!hero.moveLocked}
              disabled={busy}
              onChange={(e) =>
                onLock(hero.character.id, !e.currentTarget.checked)
              }
            />
          </Group>
        ))}
      </Stack>
      <Text size="xs" c="dimmed">
        Выключенный герой не ходит, даже в свой ход в бою. Двигать его можете
        только вы.
      </Text>
    </Stack>
  );
}

export default MoveLockSwitches;
