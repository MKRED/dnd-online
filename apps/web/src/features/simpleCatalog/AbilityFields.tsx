import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useEffect, useRef } from 'react';
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
  // Стала заклинанием — круг подставляет ячейку. При открытии формы не трогаем: у
  // сохранённой записи затраты уже такие, как задал автор.
  const previous = useRef(category);
  useEffect(() => {
    if (previous.current === category) return;
    previous.current = category;
    if (category === 'spell')
      suggestSpellSlot(form, Number(form.getValues().spell.level), null);
  }, [category, form]);

  return (
    <Stack gap="md">
      {category === 'spell' && <SpellFields form={form} />}
      <UsageField form={form} />
      <StepsField form={form} />
    </Stack>
  );
}

export default AbilityFields;
