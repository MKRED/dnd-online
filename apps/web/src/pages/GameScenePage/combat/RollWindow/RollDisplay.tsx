import { Text } from '@mantine/core';
import type { D20Roll, D20RollInput, RollMode } from 'shared';
import D20 from './D20';
import RollTerms from './RollTerms';
import { MODE_LABELS, reasonsText } from './rollWindowText';
import classes from './RollWindow.module.css';

interface RollDisplayProps {
  pending: Omit<D20RollInput, 'master'> | null;
  // Число на грани, пока кость в полёте; null — не в полёте.
  rolling: number | null;
  done: D20Roll | null;
  // Как бросают до броска: по правилам или как выбрал мастер.
  mode: RollMode;
}

// Кость к20 со слагаемыми и причинами — общая часть окна броска и окна атаки.
function RollDisplay({ pending, rolling, done, mode }: RollDisplayProps) {
  const shown = done ? done.mode : mode;
  const reasons = done ? done.reasons : pending?.reasons;
  const why = reasons ? reasonsText(reasons) : null;
  return (
    <>
      <div className={classes.dice} aria-live="polite">
        {done ? (
          done.dice.map((value, i) => (
            <D20
              key={i}
              value={value}
              dropped={i !== done.kept}
              size={i === done.kept ? 120 : 72}
            />
          ))
        ) : (
          <D20 value={rolling} rolling={rolling !== null} />
        )}
      </div>
      {shown !== 'normal' && (
        <Text
          size="sm"
          fw={600}
          ta="center"
          data-mode={shown}
          className={classes.mode}
        >
          {MODE_LABELS[shown]}
          {done && done.master && ' (мастер)'}
        </Text>
      )}
      {why && (
        <Text size="xs" c="dimmed" ta="center">
          {why}
        </Text>
      )}
      <RollTerms done={done} pending={pending} />
    </>
  );
}

export default RollDisplay;
