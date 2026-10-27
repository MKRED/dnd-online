import { Popover } from '@mantine/core';
import { useState } from 'react';
import Portrait from '../../participants/Portrait';
import CombatantMenu from './CombatantMenu';
import type { CombatEntry } from './combatEntries';
import type { StripActions } from './stripActions';
import classes from './TurnStrip.module.css';

interface QueueListProps {
  entries: readonly CombatEntry[];
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
  more,
  turn,
  acted,
  master,
  actions,
}: QueueListProps) {
  const [opened, setOpened] = useState(false);
  const rolled = entries.filter((e) => e.combatant.initiative !== null);
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
          {entries.map((entry) => {
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
            return (
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
          })}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}

export default QueueList;
