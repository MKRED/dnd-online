import { IconQuestionMark } from '@tabler/icons-react';
import classes from './TurnStrip.module.css';

// Безымянный «Ход противника» (решение Михаила 2026-10-27, вариант А): игрок видит, что
// кто-то ходит, но не кто и не где. Есть в полосе, только пока он ходит.
function HiddenTurnCell() {
  return (
    <div
      className={classes.cell}
      data-current
      data-hidden-turn
      role="img"
      aria-label="Ход противника"
      title="Ход противника"
    >
      <span className={classes.unknown} aria-hidden="true">
        <IconQuestionMark size={20} />
      </span>
      <span className={classes.number} data-waiting>
        ?
      </span>
    </div>
  );
}

export default HiddenTurnCell;
