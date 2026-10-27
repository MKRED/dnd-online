import { Popover } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';
import type { GameCombat } from 'shared';
import { useState } from 'react';
import Portrait from '../../participants/Portrait';
import CombatantMenu from './CombatantMenu';
import type { CombatEntry } from './combatEntries';
import type { StripActions } from './stripActions';
import classes from './TurnStrip.module.css';

interface QueueListProps {
  entries: readonly CombatEntry[];
  hiddenTurn: GameCombat['hiddenTurn'];
  more: number;
  turn: string | null;
  acted: string | null;
  master: boolean;
  actions: StripActions;
}

// «+N» в конце полосы: вся очередь списком — кто не влез, тоже здесь (макет «Очерёдность»,
// вариант А). Строка ведёт себя как портрет: у мастера меню, у игрока — показать на сцене.
function QueueList({
  entries,
  hiddenTurn,
  more,
  turn,
  acted,
  master,
  actions,
}: QueueListProps) {
  const [opened, setOpened] = useState(false);
  const rolled = entries.filter((e) => e.combatant.initiative !== null);
  // «Ход противника» — строкой на том же месте, что в полосе.
  const hiddenAt = !hiddenTurn
    ? -1
    : hiddenTurn.after === null
      ? 0
      : entries.findIndex((e) => e.id === hiddenTurn.after) + 1;
  const hiddenRow = (
    <div
      key="hidden-turn"
      className={classes.queueRow}
      data-current
      role="listitem"
    >
      <span className={classes.unknown} aria-hidden="true">
        <IconQuestionMark size={16} />
      </span>
      <span className={classes.queueName}>Ход противника</span>
    </div>
  );
  return (
    <Popover
      opened={opened}
      onChange={setOpened}
      position="bottom-end"
      withArrow
      shadow="md"
      width={260}
    >
      <Popover.Target>
        <button
          type="button"
          className={classes.more}
          aria-label={`Вся очередь, ещё ${more}`}
          title="Вся очередь"
          onClick={() => setOpened((o) => !o)}
        >
          +{more}
        </button>
      </Popover.Target>
      <Popover.Dropdown p={4}>
        <div className={classes.queue} role="list" aria-label="Очередь хода">
          {entries.map((entry, index) => {
            const place = rolled.indexOf(entry);
            const row = (
              <button
                type="button"
                className={classes.queueRow}
                data-current={entry.id === turn || undefined}
                data-acted={entry.id === acted || undefined}
                role="listitem"
                onClick={master ? undefined : () => actions.focus(entry)}
              >
                <Portrait
                  image={entry.image}
                  name={entry.name}
                  kind={entry.kind}
                  size={26}
                />
                <span className={classes.queueName}>{entry.name}</span>
                <span className={classes.number}>
                  {entry.combatant.initiative ?? '…'}
                </span>
              </button>
            );
            const menu = (
              <CombatantMenu
                key={entry.id}
                entry={entry}
                master={master}
                place={place === -1 ? null : place}
                count={rolled.length}
                current={entry.id === turn}
                actions={actions}
                inline
              >
                {row}
              </CombatantMenu>
            );
            return index === hiddenAt ? [hiddenRow, menu] : menu;
          })}
          {hiddenAt === entries.length && hiddenRow}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}

export default QueueList;
