import classes from './TurnStrip.module.css';

interface RoundDividerProps {
  round: number;
  // В списке «+N» — строкой, в полосе — чертой между портретами.
  row?: boolean;
}

// Черта, где начинается новый раунд (решение Михаила 2026-10-28, вариант А макета
// «Разделитель раундов»): без неё «7 → 6 → 13 → 8» читается как перепутанный порядок.
function RoundDivider({ round, row = false }: RoundDividerProps) {
  const label = `Раунд ${round}`;
  if (row) {
    return (
      <div className={classes.queueDivider} role="separator" aria-label={label}>
        <span>{label}</span>
      </div>
    );
  }
  return (
    <div
      className={classes.divider}
      role="separator"
      aria-label={label}
      title={label}
    >
      <span>{round}</span>
    </div>
  );
}

export default RoundDivider;
