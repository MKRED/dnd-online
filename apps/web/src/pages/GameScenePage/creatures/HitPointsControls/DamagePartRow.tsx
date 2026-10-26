import { ActionIcon, Group, NumberInput, Select } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import {
  DAMAGE_TYPE_LABELS,
  DAMAGE_TYPES,
  HIT_POINTS_CHANGE_MAX,
  type DamageType,
} from 'shared';
import type { DamageRow } from './damageRows';

// «Без типа» — пунктом списка, а не крестиком очистки: крестик рядом с «Убрать часть»
// путался бы с ним.
const UNTYPED = 'none';
const TYPE_OPTIONS = [
  { value: UNTYPED, label: 'Без типа' },
  ...DAMAGE_TYPES.map((type) => ({
    value: type,
    label: DAMAGE_TYPE_LABELS[type],
  })),
];

interface DamagePartRowProps {
  row: DamageRow;
  // Номер строки с 0: у первой подписи короче — её чаще всего ищут.
  index: number;
  onChange: (row: DamageRow) => void;
  // Нет — строка одна, убирать нечего.
  onRemove?: () => void;
  onEnter: () => void;
}

// Строка «число + тип» в блоке хитов. Тип нужен только урону; поиск по названию —
// чтобы набрать «нек» и не листать 13 типов.
function DamagePartRow({
  row,
  index,
  onChange,
  onRemove,
  onEnter,
}: DamagePartRowProps) {
  const part = index === 0 ? '' : `, часть ${index + 1}`;
  return (
    <Group gap={4} wrap="nowrap">
      <NumberInput
        aria-label={`Сколько хитов${part}`}
        placeholder="Сколько"
        size="xs"
        w={76}
        min={0}
        max={HIT_POINTS_CHANGE_MAX}
        allowDecimal={false}
        allowNegative={false}
        value={row.amount}
        onChange={(amount) => onChange({ ...row, amount })}
        onKeyDown={(event) => {
          // Enter — самое частое: урон.
          if (event.key === 'Enter') onEnter();
        }}
      />
      <Select
        aria-label={`Тип урона${part}`}
        size="xs"
        style={{ flex: 1, minWidth: 0 }}
        data={TYPE_OPTIONS}
        value={row.type ?? UNTYPED}
        onChange={(type) =>
          onChange({
            ...row,
            type: type && type !== UNTYPED ? (type as DamageType) : null,
          })
        }
        searchable
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
      />
      {onRemove && (
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          aria-label={`Убрать часть ${index + 1}`}
          onClick={onRemove}
        >
          <IconX size={14} />
        </ActionIcon>
      )}
    </Group>
  );
}

export default DamagePartRow;
