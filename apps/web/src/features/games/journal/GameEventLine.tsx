import { Badge } from '@mantine/core';
import type { ReactNode } from 'react';
import {
  creatureHealth,
  creatureHealthLabel,
  damageDealtParts,
  type GameCreatureHitPoints,
  type GameEvent,
} from 'shared';
import classes from './Journal.module.css';
import DamagePartsText from './DamagePartsText';
import { gameEventText } from './gameEventText';
import type { JournalView } from './journalView';

type Changed = Extract<
  GameEvent,
  { kind: 'character.changed' | 'creature.changed' }
>;

// Строка записи журнала. Урон, лечение и временные хиты — с частями урона, хитами и
// меткой здоровья; глазами игроков у монстров и НПС хитов и запаса движения нет
// (shared/game-event-visibility.ts). Остальное — фразой gameEventText.
function GameEventLine({
  event,
  view,
}: {
  event: GameEvent;
  view: JournalView;
}) {
  if (event.kind === 'creature.moved' && view === 'players') {
    return <>Ход: {event.result.creature.name}</>;
  }
  if (event.kind === 'character.changed' || event.kind === 'creature.changed') {
    const line = hitPointsLine(event, view);
    if (line) return line;
  }
  return <>{gameEventText(event)}</>;
}

function hitPointsLine(event: Changed, view: JournalView): ReactNode {
  const { change } = event.intent;
  // Спасброски от смерти и ячейки — фразой gameEventText.
  if (
    change.kind !== 'damage' &&
    change.kind !== 'heal' &&
    change.kind !== 'temp'
  ) {
    return null;
  }
  const creature = event.kind === 'creature.changed';
  const name = creature
    ? event.result.creature.name
    : event.result.character.name;
  const before = creature
    ? event.result.before.current
    : event.result.before.hitPointsCurrent;
  const after = creature
    ? event.result.after.current
    : event.result.after.hitPointsCurrent;
  // Персонажи партии видны партии целиком, монстры и НПС игрокам — без хитов.
  const showHp = !creature || view === 'master';
  const hp = showHp && (
    <>
      {' '}
      <span className={classes.hitPoints}>
        хиты {before} → {after}
      </span>
    </>
  );
  const tag = creature && healthTag(event.result.before, event.result.after);
  return (
    <>
      {TITLES[change.kind]}: <b>{name}</b> —{' '}
      {change.kind === 'damage' ? (
        <DamagePartsText parts={damageDealtParts(change)} />
      ) : (
        <span className={classes.amount}>{change.amount}</span>
      )}
      {change.kind !== 'temp' && hp}
      {!creature && event.result.instantDeath && ', мгновенная смерть'}
      {tag}
    </>
  );
}

const TITLES = {
  damage: 'Урон',
  heal: 'Лечение',
  temp: 'Временные хиты',
} as const;

// «Ранен» или «Повержен», если метка сменилась: её игроки видят и над существом на карте.
function healthTag(
  before: GameCreatureHitPoints,
  after: GameCreatureHitPoints,
) {
  const was = creatureHealth({ ...before, deathFailures: 0 });
  const now = creatureHealth({ ...after, deathFailures: 0 });
  if (!now || now === was) return null;
  return (
    <>
      {' '}
      <Badge
        component="span"
        size="xs"
        variant="light"
        color={now === 'bloodied' ? 'orange' : 'red'}
        className={classes.health}
      >
        {creatureHealthLabel(now, false)}
      </Badge>
    </>
  );
}

export default GameEventLine;
