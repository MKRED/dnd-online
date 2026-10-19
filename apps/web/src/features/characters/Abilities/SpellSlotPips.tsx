import { Group, Text, UnstyledButton } from '@mantine/core';
import type { SpellSlotCircle, SpellSlotLevel } from 'shared';
import classes from './Abilities.module.css';

interface SpellSlotPipsProps {
  level: SpellSlotCircle;
  slots: SpellSlotLevel;
  busy: boolean;
  // Есть — автор тратит и возвращает ячейки; нет — кружки только для чтения.
  onSpend?: (expended: number) => void;
}

// Ряд кружков круга: полный — ячейка есть, пустой — потрачена. Потраченные всегда
// справа: важно, сколько потрачено, а не какая именно ячейка. Поэтому клик по любому
// полному тратит одну ячейку, по любому пустому — одну возвращает.
function SpellSlotPips({ level, slots, busy, onSpend }: SpellSlotPipsProps) {
  const { total, expended } = slots;
  const left = total - expended;
  const label = `Ячейки ${level} круга: осталось ${left} из ${total}`;
  const pips = Array.from({ length: total }, (_, i) => i < left);

  return (
    <Group gap={0} wrap="nowrap" role="group" aria-label={label}>
      {pips.map((full, i) =>
        onSpend ? (
          <UnstyledButton
            key={i}
            className={classes.pipButton}
            disabled={busy}
            aria-label={
              full
                ? `Потратить ячейку ${level} круга`
                : `Вернуть ячейку ${level} круга`
            }
            onClick={() => onSpend(full ? expended + 1 : expended - 1)}
          >
            <span className={classes.pip} data-full={full || undefined} />
          </UnstyledButton>
        ) : (
          <span key={i} className={classes.pipCell} aria-hidden>
            <span className={classes.pip} data-full={full || undefined} />
          </span>
        ),
      )}
      <Text size="xs" c="dimmed" ml={6} aria-hidden>
        {left}/{total}
      </Text>
    </Group>
  );
}

export default SpellSlotPips;
