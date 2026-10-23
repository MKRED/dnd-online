import { Alert, Button, Group, Stack, Text, Tooltip } from '@mantine/core';
import { IconRefresh } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import ParticipantRow, { type Participant } from './ParticipantRow';
import classes from './participants.module.css';

interface ParticipantsTabProps {
  heroes: readonly Participant[];
  // Монстры и НПС — только у мастера; у игрока пусто.
  creatures: readonly Participant[];
  selectedKey: string | null;
  onSelectHero: (key: string) => void;
  onSelectCreature: (key: string) => void;
  // «Новый раунд» — только мастеру.
  onRound?: () => void;
  busy: boolean;
  errors: readonly (string | null)[];
  // Состояние выбранного: хиты, эффекты, запас — внизу вкладки.
  selected: ReactNode;
}

// Вкладка «Участники» (docs/plan/scene-page.md, этап 2): герои и существа одним списком по
// группам, у выбранного — его состояние внизу. Подсказки про ход — плашкой на сцене.
function ParticipantsTab({
  heroes,
  creatures,
  selectedKey,
  onSelectHero,
  onSelectCreature,
  onRound,
  busy,
  errors,
  selected,
}: ParticipantsTabProps) {
  const empty = heroes.length === 0 && creatures.length === 0;
  return (
    <>
      <Stack gap={2}>
        {onRound && !empty && (
          <Group justify="flex-end" pb={4}>
            <Tooltip label="Запас движения всех снова полный" withArrow>
              <Button
                size="xs"
                variant="default"
                leftSection={<IconRefresh size={15} />}
                onClick={onRound}
                disabled={busy}
              >
                Новый раунд
              </Button>
            </Tooltip>
          </Group>
        )}
        {empty && (
          <Text size="sm" c="dimmed" p="xs">
            На сцене никого нет. Персонажи встают на стартовые точки, когда
            садятся на места.
          </Text>
        )}
        {heroes.length > 0 && <div className={classes.section}>Герои</div>}
        {heroes.map((hero) => (
          <ParticipantRow
            key={hero.key}
            participant={hero}
            selected={selectedKey === `pc:${hero.key}`}
            onSelect={() => onSelectHero(hero.key)}
          />
        ))}
        {creatures.length > 0 && (
          <div className={classes.section}>Существа</div>
        )}
        {creatures.map((creature) => (
          <ParticipantRow
            key={creature.key}
            participant={creature}
            selected={selectedKey === `creature:${creature.key}`}
            onSelect={() => onSelectCreature(creature.key)}
          />
        ))}
        {errors.map(
          (error) =>
            error && (
              <Alert key={error} color="red" mt="xs">
                {error}
              </Alert>
            ),
        )}
      </Stack>
      {selected && <section className={classes.selected}>{selected}</section>}
    </>
  );
}

export default ParticipantsTab;
