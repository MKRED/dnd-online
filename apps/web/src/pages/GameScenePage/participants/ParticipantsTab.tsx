import { Alert, Text } from '@mantine/core';
import { useMemo, type ReactNode } from 'react';
import ParticipantGroups from './ParticipantGroups';
import type { Participant } from './ParticipantRow';
import { participantGroups } from './participantGroups';
import { useDoubleOpen } from './useDoubleOpen';
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
  errors: readonly (string | null)[];
  // Состояние выбранного: хиты, эффекты, запас.
  selected: ReactNode;
}

// Вкладка «Участники» (docs/plan/done/scene-page.md, этап 2; замечания после первой партии,
// 2026-10-26, вариант А): состояние выбранного — наверху и на месте, под ним список по
// сворачиваемым группам прокручивается сам. Подсказки про ход — плашкой на сцене.
function ParticipantsTab({
  heroes,
  creatures,
  selectedKey,
  onSelectHero,
  onSelectCreature,
  onOpenHero,
  onOpenCreature,
  errors,
  selected,
}: ParticipantsTabProps) {
  const groups = useMemo(
    () => participantGroups([...heroes, ...creatures]),
    [heroes, creatures],
  );
  const doubleOpen = useDoubleOpen(
    selectedKey,
    (p) => (p.kind === 'pc' ? onSelectHero(p.key) : onSelectCreature(p.key)),
    (p) => {
      if (p.kind === 'pc') {
        return p.selectable && onOpenHero ? () => onOpenHero(p.key) : undefined;
      }
      return onOpenCreature && (() => onOpenCreature(p.key));
    },
  );
  const empty = groups.length === 0;
  return (
    <div className={classes.tab} onClickCapture={doubleOpen.catchSecond}>
      {selected && <section className={classes.selected}>{selected}</section>}
      <div className={classes.list}>
        {empty && (
          <Text size="sm" c="dimmed" p="xs">
            На сцене никого нет. Персонажи встают на стартовые точки, когда
            садятся на места.
          </Text>
        )}
        <ParticipantGroups
          groups={groups}
          selectedKey={selectedKey}
          onSelect={doubleOpen.click}
        />
        {errors.map(
          (error) =>
            error && (
              <Alert key={error} color="red" mt="xs">
                {error}
              </Alert>
            ),
        )}
      </div>
    </div>
  );
}

export default ParticipantsTab;
