import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useEffect, useRef } from 'react';
import { MONSTER_ACTIVATION_KINDS, type AbilityActivationKind } from 'shared';
import MonsterAbilityFields from './MonsterAbilityFields';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import SpellFields, { suggestSpellSlot } from './SpellFields';
import StepsField from './StepsField';
import UsageField from './UsageField';

// Поля категории, потом активация и затраты, потом «Применение»: сначала что это, затем
// как применяют, затем что происходит.
function AbilityFields({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const { category } = form.getValues();
  // Стала заклинанием — круг подставляет ячейку. Перестала быть способностью монстра —
  // черта и легендарное действие сменяются действием: в другой категории их нет и в
  // списке активаций. При открытии формы не трогаем: у сохранённой записи всё так, как
  // задал автор.
  const previous = useRef(category);
  useEffect(() => {
    if (previous.current === category) return;
    previous.current = category;
    if (category === 'spell')
      suggestSpellSlot(form, Number(form.getValues().spell.level), null);
    const monsterOnly: readonly AbilityActivationKind[] =
      MONSTER_ACTIVATION_KINDS;
    if (
      category !== 'monster' &&
      monsterOnly.includes(form.getValues().usage.kind)
    )
      form.setFieldValue('usage.kind', 'action');
  }, [category, form]);

  return (
    <Stack gap="md">
      {category === 'spell' && <SpellFields form={form} />}
      {category === 'monster' && <MonsterAbilityFields form={form} />}
      <UsageField form={form} />
      <StepsField form={form} />
    </Stack>
  );
}

export default AbilityFields;
