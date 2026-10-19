import { Select, type SelectProps } from '@mantine/core';
import { formatPerDay, MONSTER_SPELL_PER_DAY_MAX } from 'shared';

// У Mantine значение Select — строка, поэтому у «Неограниченно» свой ключ.
const UNLIMITED = 'unlimited';
const OPTIONS = [
  { value: UNLIMITED, label: formatPerDay(null) },
  ...Array.from({ length: MONSTER_SPELL_PER_DAY_MAX }, (_, i) => ({
    value: String(i + 1),
    label: formatPerDay(i + 1),
  })),
];

type PerDaySelectProps = Omit<
  SelectProps,
  'data' | 'value' | 'onChange' | 'allowDeselect'
> & {
  value: number | null;
  onChange: (perDay: number | null) => void;
};

// «Неограниченно» или «N/день» — частота заклинания монстра.
function PerDaySelect({ value, onChange, ...props }: PerDaySelectProps) {
  return (
    <Select
      {...props}
      data={OPTIONS}
      value={value === null ? UNLIMITED : String(value)}
      onChange={(next) =>
        onChange(next === null || next === UNLIMITED ? null : Number(next))
      }
      allowDeselect={false}
    />
  );
}

export default PerDaySelect;
