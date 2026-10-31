import { forwardRef, type ComponentPropsWithoutRef } from 'react';
import { creatureHealthLabel } from 'shared';
import Portrait from '../../participants/Portrait';
import GameIcon from '../TurnPanel/gameIcons';
import type { CombatEntry } from './combatEntries';
import classes from './TurnStrip.module.css';

interface TurnPortraitProps extends ComponentPropsWithoutRef<'button'> {
  entry: CombatEntry;
  current: boolean;
  acted: boolean;
}

// Портрет в полосе: число инициативы (или «…», пока не бросил) и полоска здоровья. Полоска —
// только тем, кому видны хиты (мастеру у всех, игроку у героев отряда): у врага игрок
// не видит её вовсе, «Ранен» остаётся в подписи и в метке на сцене (решено с
// пользователем 2026-10-31). Значок в углу — «Уклонение» или «Отход»
// (docs/plan/combat.md, этап 4, вариант А): его видят все.
const TurnPortrait = forwardRef<HTMLButtonElement, TurnPortraitProps>(
  function TurnPortrait({ entry, current, acted, className, ...rest }, ref) {
    const { initiative, dodging, disengaged } = entry.combatant;
    const health = entry.health;
    const hp = entry.hitPoints;
    const share = hp
      ? Math.max(0, Math.min(1, hp.current / Math.max(1, hp.max)))
      : null;
    const label = [
      entry.name,
      initiative === null
        ? 'ещё не бросил инициативу'
        : `инициатива ${initiative}`,
      health ? creatureHealthLabel(health, entry.kind === 'pc') : null,
      dodging ? 'уклоняется' : null,
      disengaged ? 'отходит' : null,
      current ? 'сейчас ходит' : null,
    ]
      .filter(Boolean)
      .join(', ');
    return (
      <button
        {...rest}
        ref={ref}
        type="button"
        // Меню мастера кладёт на цель свои классы — они вместе с нашим.
        className={[classes.cell, className].filter(Boolean).join(' ')}
        data-current={current || undefined}
        data-acted={acted || undefined}
        data-health={health ?? undefined}
        title={label}
        aria-label={label}
      >
        <Portrait
          image={entry.image}
          name={entry.name}
          kind={entry.kind}
          size={34}
        />
        {(dodging || disengaged) && (
          <span className={classes.badge} aria-hidden="true">
            <GameIcon name={dodging ? 'dodge' : 'exit'} />
          </span>
        )}
        <span
          className={classes.number}
          data-waiting={initiative === null || undefined}
        >
          {initiative ?? '…'}
        </span>
        {/* Без хитов место под полоской остаётся пустым: портреты в полосе одной высоты. */}
        <span
          className={classes.bar}
          data-empty={share === null || undefined}
          aria-hidden="true"
        >
          {share !== null && (
            <span
              className={classes.barFill}
              data-low={share <= 0.5 || undefined}
              style={{ width: `${share * 100}%` }}
            />
          )}
        </span>
      </button>
    );
  },
);

export default TurnPortrait;
