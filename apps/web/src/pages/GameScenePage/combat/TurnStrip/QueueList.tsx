import { Popover } from '@mantine/core';
import { IconQuestionMark } from '@tabler/icons-react';
import { useState } from 'react';
import Portrait from '../../participants/Portrait';
import CombatantMenu from './CombatantMenu';
import type { CombatEntry } from './combatEntries';
import RoundDivider from './RoundDivider';
import type { StripActions } from './stripActions';
import { HIDDEN_TURN } from './stripSlots';
import classes from './TurnStrip.module.css';

interface QueueListProps {
  entries: readonly CombatEntry[];
  // Вся очередь в порядке полосы (stripSlots без предела) — с «Ходом противника».
  ids: readonly string[];
  // Перед каким местом ids строка «Раунд N»; null — без неё.
  divider: { at: number; round: number } | null;
  more: number;
  turn: string | null;
  acted: string | null;
  master: boolean;
  actions: StripActions;
}

// «+N» в конце полосы: вся очередь списком — кто не влез, тоже здесь (макет «Очерёдность»,
// вариант А), в том же порядке, что полоса, и с той же чертой раунда. Строка ведёт себя как
// портрет: у мастера меню, у игрока — показать на сцене.
function QueueList({
  entries,
  ids,
  divider,
  more,
  turn,
  acted,
  master,
  actions,
}: QueueListProps) {
  const [opened, setOpened] = useState(false);
  const rolled = entries.filter((e) => e.combatant.initiative !== null);
  const byId = new Map(entries.map((e) => [e.id, e]));
  // «Ход противника» — строкой на том же месте, что в полосе.
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
          {ids.map((id, index) => {
            const line = divider?.at === index && (
              <RoundDivider key="round" round={divider.round} row />
            );
            if (id === HIDDEN_TURN) return [line, hiddenRow];
            const entry = byId.get(id);
            if (!entry) return null;
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
            return [line, menu];
          })}
        </div>
      </Popover.Dropdown>
    </Popover>
  );
}

export default QueueList;
