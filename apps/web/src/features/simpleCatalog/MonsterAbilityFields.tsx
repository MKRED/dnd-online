import { Select } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { RECHARGE_MAX, RECHARGE_MIN, formatRecharge } from 'shared';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';

const RECHARGE_OPTIONS = [
  { value: 'none', label: 'Нет' },
  ...Array.from({ length: RECHARGE_MAX - RECHARGE_MIN + 1 }, (_, i) => {
    const recharge = RECHARGE_MIN + i;
    return { value: String(recharge), label: formatRecharge(recharge) };
  }),
];

// Черта и легендарное действие — в «Активации» ниже, здесь только перезарядка.
function MonsterAbilityFields({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  return (
    <Select
      label="Перезарядка"
      description="В начале хода монстр бросает к6 и при этом числе или выше снова может применить способность"
      data={RECHARGE_OPTIONS}
      allowDeselect={false}
      maw={320}
      {...form.getInputProps('monster.recharge')}
    />
  );
}

export default MonsterAbilityFields;
