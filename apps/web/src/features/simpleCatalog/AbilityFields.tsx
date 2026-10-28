import { Stack } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useEffect, useRef } from 'react';
import {
  activationKindFitsCategory,
  hasRules,
  type AbilityCategory,
} from 'shared';
import { ComponentsField } from './EffectFields';
import MonsterAbilityFields from './MonsterAbilityFields';
import type { SimpleFormValues } from './SimpleEntryForm/simpleEntryValues';
import SpellFields, { suggestSpellSlot } from './SpellFields';
import StepsField from './StepsField';
import UsageField from './UsageField';

// Поля категории, потом активация и затраты, потом «Применение»: сначала что это, затем
// как применяют, затем что происходит. Что есть у какой категории —
// shared/abilityCategoryRules.ts (docs/plan/ability-categories.md).
function AbilityFields({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const { category, usage } = form.getValues();
  const trait = usage.kind === 'trait';
  const rules = hasRules(category as AbilityCategory);
  // Стала заклинанием — круг подставляет ячейку. Активации, которой в новой категории нет
  // (легендарное действие не у монстра, черта или «без действия» у заклинания), сменяется
  // действием: её нет и в списке активаций. Стала «Базовой» — шаги и составляющие
  // убираются: их у неё нет, а недописанная карточка в скрытом блоке не дала бы сохранить
  // форму. При открытии формы не трогаем: у сохранённой записи всё так, как задал автор.
  const previous = useRef(category);
  useEffect(() => {
    if (previous.current === category) return;
    previous.current = category;
    if (category === 'spell')
      suggestSpellSlot(form, Number(form.getValues().spell.level), null);
    if (
      !activationKindFitsCategory(
        category as AbilityCategory,
        form.getValues().usage.kind,
      )
    )
      form.setFieldValue('usage.kind', 'action');
    if (!hasRules(category as AbilityCategory)) {
      form.setFieldValue('steps', []);
      form.setFieldValue('effect.components', []);
    }
  }, [category, form]);
  // Перестала быть чертой — составляющие убираются: у других активаций их нет.
  const wasTrait = useRef(trait);
  useEffect(() => {
    if (wasTrait.current && !trait) form.setFieldValue('effect.components', []);
    wasTrait.current = trait;
  }, [trait, form]);

  return (
    <Stack gap="md">
      {category === 'spell' && <SpellFields form={form} />}
      <UsageField form={form}>
        {trait && rules && (
          <ComponentsField
            form={form}
            label="Действует всегда"
            description="Что черта даёт владельцу, пока она у него на листе. Лист считает это и в виде «Без эффектов». Без составляющих — всё в описании"
          />
        )}
        {category === 'monster' && !trait && (
          <MonsterAbilityFields form={form} />
        )}
      </UsageField>
      {rules && <StepsField form={form} />}
    </Stack>
  );
}

export default AbilityFields;
