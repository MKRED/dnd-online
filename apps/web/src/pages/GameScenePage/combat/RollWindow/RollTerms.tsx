import type { D20Roll, D20RollInput } from 'shared';
import { termAmount } from './rollWindowText';
import classes from './RollWindow.module.css';

interface RollTermsProps {
  done: D20Roll | null;
  pending: Omit<D20RollInput, 'master'> | null;
}

// Слагаемые столбиком: до броска — что прибавится, после — засчитанная к20, слагаемые и итог.
function RollTerms({ done, pending }: RollTermsProps) {
  const terms = done?.terms ?? pending?.terms ?? [];
  if (!done && terms.length === 0) return null;
  return (
    <dl className={classes.terms}>
      {done && (
        <div className={classes.term}>
          <dt>к20</dt>
          <dd>{done.dice[done.kept]}</dd>
        </div>
      )}
      {terms.map((term, i) => (
        <div key={i} className={classes.term}>
          <dt>{term.label}</dt>
          <dd>{termAmount(term)}</dd>
        </div>
      ))}
      {done && (
        <div className={classes.total}>
          <dt>Итог</dt>
          <dd>{done.total}</dd>
        </div>
      )}
    </dl>
  );
}

export default RollTerms;
