import { Alert, Stack, Text } from '@mantine/core';
import { Fragment, type ReactNode } from 'react';
import ParticipantRow, { type Participant } from './ParticipantRow';
import classes from './participants.module.css';

interface ParticipantsTabProps {
  heroes: readonly Participant[];
  // Монстры и НПС — только у мастера; у игрока пусто.
  creatures: readonly Participant[];
  selectedKey: string | null;
  onSelectHero: (key: string) => void;
  onSelectCreature: (key: string) => void;
  // Двойной щелчок по строке — окно карточки (docs/plan/done/scene-page.md, этап 4).
  onOpenHero?: (key: string) => void;
  onOpenCreature?: (key: string) => void;
  // Бой мастера: «Начать бой» или раунд, «Новый раунд» и «Закончить бой» (combat/).
  combat?: ReactNode;
  errors: readonly (string | null)[];
  // Состояние выбранного: хиты, эффекты, запас — внизу вкладки.
  selected: ReactNode;
}

// Вкладка «Участники» (docs/plan/done/scene-page.md, этап 2): герои и существа одним списком по
// группам, у выбранного — его состояние внизу. Подсказки про ход — плашкой на сцене.
function ParticipantsTab({
  heroes,
  creatures,
  selectedKey,
  onSelectHero,
  onSelectCreature,
  onOpenHero,
  onOpenCreature,
  combat,
  errors,
  selected,
}: ParticipantsTabProps) {
  const empty = heroes.length === 0 && creatures.length === 0;
  return (
    <>
      <Stack gap={2}>
        {!empty && combat}
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
            onOpen={
              hero.selectable && onOpenHero
                ? () => onOpenHero(hero.key)
                : undefined
            }
          />
        ))}
        {/* НПС — своим разделом между героями и существами (пользователь, 2026-10-24):
            союзники и торговцы не теряются среди монстров. */}
        {[
          { title: 'НПС', rows: creatures.filter((c) => c.kind === 'npc') },
          {
            title: 'Существа',
            rows: creatures.filter((c) => c.kind !== 'npc'),
          },
        ].map(
          ({ title, rows }) =>
            rows.length > 0 && (
              <Fragment key={title}>
                <div className={classes.section}>{title}</div>
                {rows.map((creature) => (
                  <ParticipantRow
                    key={creature.key}
                    participant={creature}
                    selected={selectedKey === `creature:${creature.key}`}
                    onSelect={() => onSelectCreature(creature.key)}
                    onOpen={
                      onOpenCreature && (() => onOpenCreature(creature.key))
                    }
                  />
                ))}
              </Fragment>
            ),
        )}
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
