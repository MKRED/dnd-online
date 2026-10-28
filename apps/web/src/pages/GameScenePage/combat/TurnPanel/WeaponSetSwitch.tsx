import { SegmentedControl } from '@mantine/core';
import { WEAPON_SET_LABELS, WEAPON_SETS, type WeaponSet } from 'shared';

interface WeaponSetSwitchProps {
  value: WeaponSet;
  // Почему переключить нельзя; null — можно.
  blocked: string | null;
  busy: boolean;
  onChange: (set: WeaponSet) => void;
}

// «Ближний | Дальний» у заголовка «Атаки» (решение к этапу 5, вопрос 1, вариант Б):
// бесплатно, раз за свой ход.
function WeaponSetSwitch({
  value,
  blocked,
  busy,
  onChange,
}: WeaponSetSwitchProps) {
  return (
    <span title={blocked ?? 'Сменить набор оружия: бесплатно, раз за ход'}>
      <SegmentedControl
        size="xs"
        aria-label="Набор оружия"
        value={value}
        disabled={blocked !== null || busy}
        onChange={(v) => onChange(v)}
        data={WEAPON_SETS.map((set) => ({
          value: set,
          label: WEAPON_SET_LABELS[set],
        }))}
      />
    </span>
  );
}

export default WeaponSetSwitch;
