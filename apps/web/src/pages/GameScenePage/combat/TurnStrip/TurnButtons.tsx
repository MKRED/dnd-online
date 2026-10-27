import { Alert, Button } from '@mantine/core';
import { IconDice5, IconPlayerTrackNext } from '@tabler/icons-react';
import type { GameCombat } from 'shared';
import type { CombatEntry } from './combatEntries';
import classes from './TurnStrip.module.css';

interface TurnButtonsProps {
  combat: GameCombat;
  entries: readonly CombatEntry[];
  master: boolean;
  busy: boolean;
  error: string | null;
  onClearError: () => void;
  onRoll: (entry: CombatEntry) => void;
  onRollCreatures: () => void;
  onEndTurn: (id: string) => void;
}

// Кнопки под полосой — самое частое в бою, рядом с очередью (макет «Очерёдность»): пока
// бросают инициативу — бросок за своего героя и (мастеру) за всех монстров разом; потом —
// «Закончить ход» тому, кто ведёт текущего.
function TurnButtons({
  combat,
  entries,
  master,
  busy,
  error,
  onClearError,
  onRoll,
  onRollCreatures,
  onEndTurn,
}: TurnButtonsProps) {
  const unrolled = entries.filter((e) => e.combatant.initiative === null);
  // Игроку — свои герои; мастер бросает за героев через меню портрета.
  const mine = master
    ? []
    : unrolled.filter((e) => e.combatant.canRoll && e.kind === 'pc');
  const creatures = master ? unrolled.filter((e) => e.kind !== 'pc') : [];
  const current = entries.find((e) => e.id === combat.turn);
  const canEnd = current?.combatant.canRoll ?? false;
  if (!mine.length && !creatures.length && !canEnd && !error) return null;
  return (
    <>
      <div className={classes.actions}>
        {mine.map((entry) => (
          <Button
            key={entry.id}
            size="xs"
            leftSection={<IconDice5 size={15} />}
            onClick={() => onRoll(entry)}
          >
            {mine.length > 1
              ? `Инициатива: ${entry.name}`
              : 'Бросить инициативу'}
          </Button>
        ))}
        {creatures.length > 0 && (
          <Button
            size="xs"
            variant="default"
            leftSection={<IconDice5 size={15} />}
            loading={busy}
            onClick={onRollCreatures}
            title="Каждый монстр и НПС бросает свою инициативу"
          >
            Бросить за монстров ({creatures.length})
          </Button>
        )}
        {current && canEnd && (
          <Button
            size="xs"
            leftSection={<IconPlayerTrackNext size={15} />}
            loading={busy}
            onClick={() => onEndTurn(current.id)}
          >
            {master && current.kind === 'pc'
              ? `Закончить ход: ${current.name}`
              : 'Закончить ход'}
          </Button>
        )}
      </div>
      {error && (
        <Alert
          className={classes.error}
          color="red"
          withCloseButton
          closeButtonLabel="Скрыть"
          onClose={onClearError}
          p="xs"
        >
          {error}
        </Alert>
      )}
    </>
  );
}

export default TurnButtons;
