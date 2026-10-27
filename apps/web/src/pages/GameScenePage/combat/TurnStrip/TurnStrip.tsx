import { ActionIcon, Paper, Tooltip } from '@mantine/core';
import { useElementSize } from '@mantine/hooks';
import { IconPlus } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import type { GameCombat } from 'shared';
import CombatantMenu from './CombatantMenu';
import type { CombatEntry } from './combatEntries';
import QueueList from './QueueList';
import type { StripActions } from './stripActions';
import { stripCapacity, stripSlots } from './stripSlots';
import TurnPortrait from './TurnPortrait';
import classes from './TurnStrip.module.css';

interface TurnStripProps {
  combat: GameCombat;
  entries: readonly CombatEntry[];
  master: boolean;
  actions: StripActions;
  // Мастеру: «+» — позвать в бой новичка.
  onAdd: () => void;
  // Кнопки и ошибка под полосой.
  children?: ReactNode;
}

// Ширина «+» мастера справа от портретов.
const ADD_WIDTH = 40;

// Полоса очерёдности над сценой (docs/plan/combat.md, этап 3; макет «Очерёдность»,
// вариант А): номер раунда, портреты по очереди с числом инициативы и здоровьем. Портретов
// столько, сколько влезает; остальные — во «+N».
function TurnStrip({
  combat,
  entries,
  master,
  actions,
  onAdd,
  children,
}: TurnStripProps) {
  const { ref, width } = useElementSize();
  const rolled = entries.filter((e) => e.combatant.initiative !== null);
  const unrolled = entries.filter((e) => e.combatant.initiative === null);
  const capacity =
    width > 0
      ? stripCapacity(width, entries.length, master ? ADD_WIDTH : 0)
      : entries.length;
  const slots = stripSlots(
    rolled.map((e) => e.id),
    unrolled.map((e) => e.id),
    combat.turn,
    capacity,
    combat.round === 1 && rolled[0]?.id === combat.turn,
  );
  const byId = new Map(entries.map((e) => [e.id, e]));
  // Пока кто-то не бросил и ход ещё не начался — идёт бросок инициативы.
  const rolling = combat.turn === null && unrolled.length > 0;
  return (
    <div className={classes.wrap} ref={ref}>
      <Paper
        className={classes.strip}
        withBorder
        shadow="sm"
        role="group"
        aria-label="Очерёдность хода"
      >
        <div className={classes.round} role="status">
          {rolling ? (
            <>
              Бросок
              <br />
              инициативы
            </>
          ) : (
            <>
              Раунд
              <span className={classes.roundNumber}>{combat.round ?? 1}</span>
            </>
          )}
        </div>
        <div className={classes.portraits}>
          {slots.ids.map((id) => {
            const entry = byId.get(id);
            if (!entry) return null;
            const place = rolled.indexOf(entry);
            const current = id === combat.turn;
            return (
              <CombatantMenu
                key={id}
                entry={entry}
                master={master}
                place={place === -1 ? null : place}
                count={rolled.length}
                current={current}
                actions={actions}
              >
                <TurnPortrait
                  entry={entry}
                  current={current}
                  acted={id === slots.acted}
                  onClick={master ? undefined : () => actions.focus(entry)}
                />
              </CombatantMenu>
            );
          })}
        </div>
        {slots.more > 0 && (
          <QueueList
            entries={[...rolled, ...unrolled]}
            more={slots.more}
            turn={combat.turn}
            acted={slots.acted}
            master={master}
            actions={actions}
          />
        )}
        {master && (
          <Tooltip label="Позвать в бой" withArrow>
            <ActionIcon
              className={classes.add}
              variant="subtle"
              size="lg"
              aria-label="Позвать в бой"
              onClick={onAdd}
            >
              <IconPlus size={18} />
            </ActionIcon>
          </Tooltip>
        )}
      </Paper>
      {children}
    </div>
  );
}

export default TurnStrip;
