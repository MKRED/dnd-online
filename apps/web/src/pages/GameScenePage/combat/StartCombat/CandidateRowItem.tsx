import { Checkbox, Switch, Text } from '@mantine/core';
import Portrait from '../../participants/Portrait';
import type { CandidateRow } from './candidateGroups';
import classes from './StartCombat.module.css';

interface CandidateRowItemProps {
  row: CandidateRow;
  checked: boolean;
  surprised: boolean;
  onChecked: (checked: boolean) => void;
  onSurprised: (surprised: boolean) => void;
}

// Строка кандидата: галочка с портретом и именем, пометка, если партия его не видит, и
// «врасплох» (помеха на инициативу) — только у отмеченного.
function CandidateRowItem({
  row,
  checked,
  surprised,
  onChecked,
  onSurprised,
}: CandidateRowItemProps) {
  const note = row.look.hidden
    ? 'скрыт от игроков'
    : row.seen
      ? null
      : 'партия не видит';
  return (
    <div className={classes.row} data-checked={checked || undefined}>
      <Checkbox
        className={classes.check}
        checked={checked}
        onChange={(e) => onChecked(e.currentTarget.checked)}
        label={
          <span className={classes.label}>
            <Portrait
              image={row.look.image}
              name={row.name}
              kind={row.look.kind}
              size={28}
            />
            <span className={classes.name}>
              {row.name}
              {note && (
                <Text span size="xs" c="dimmed" className={classes.note}>
                  {note}
                </Text>
              )}
            </span>
          </span>
        }
      />
      {checked && (
        <Switch
          size="xs"
          label="врасплох"
          checked={surprised}
          onChange={(e) => onSurprised(e.currentTarget.checked)}
          title="Застигнут врасплох: помеха на бросок инициативы"
        />
      )}
    </div>
  );
}

export default CandidateRowItem;
