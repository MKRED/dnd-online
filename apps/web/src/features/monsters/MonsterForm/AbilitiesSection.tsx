import {
  Fieldset,
  Group,
  NumberInput,
  Paper,
  SimpleGrid,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo, useState } from 'react';
import {
  ABILITY_SCORES,
  MONSTER_ABILITY_SCORE_MAX,
  getAbilityModifier,
  type AbilityScore,
} from 'shared';
import { formErrorsEqual } from '../../../components/form';
import { ABILITY_LABELS, formatModifier } from '../../characters';
import type { MonsterFormValues, NumValue } from './monsterFormValues';

const modifierOf = (score: NumValue) =>
  typeof score === 'number' ? getAbilityModifier(score) : null;

interface AbilityFieldProps {
  form: UseFormReturnType<MonsterFormValues>;
  ability: AbilityScore;
}

// Значение и бонус спасброска. Бонус по умолчанию — модификатор: пока мастер его не
// менял, он идёт за значением. Поэтому поле спасброска управляется отсюда, а не формой.
function AbilityField({ form, ability }: AbilityFieldProps) {
  const path = `abilities.${ability}`;
  const [score, setScore] = useState(
    () => form.getValues().abilities[ability].score,
  );
  const [save, setSave] = useState(
    () => form.getValues().abilities[ability].save,
  );
  // Спасбросок «привязан» к модификатору, пока мастер не вписал своё число. Сравнивать на
  // каждом нажатии нельзя: пока значение набирают, поле бывает пустым.
  const [linked, setLinked] = useState(() => save === modifierOf(score));
  const scoreProps = form.getInputProps(`${path}.score`);
  const saveError = form.errors[`${path}.save`];
  const modifier = modifierOf(score);

  return (
    <Paper withBorder p="sm" radius="md">
      <Group justify="space-between" align="baseline" mb={4}>
        <Text fw={600}>{ABILITY_LABELS[ability]}</Text>
        <Text fw={700}>
          {modifier === null ? '—' : formatModifier(modifier)}
        </Text>
      </Group>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <NumberInput
          label="Значение"
          min={1}
          max={MONSTER_ABILITY_SCORE_MAX}
          allowDecimal={false}
          {...scoreProps}
          onChange={(value: NumValue) => {
            form.setFieldValue(`${path}.score`, value);
            setScore(value);
            const next = modifierOf(value);
            if (next !== null && linked) {
              form.setFieldValue(`${path}.save`, next);
              setSave(next);
            }
          }}
        />
        <NumberInput
          label="Спасбросок"
          allowDecimal={false}
          value={save}
          error={saveError}
          data-path={`${path}.save`}
          onChange={(value) => {
            form.setFieldValue(`${path}.save`, value);
            setSave(value);
            setLinked(value === modifier);
          }}
        />
      </Group>
    </Paper>
  );
}

interface AbilitiesSectionProps {
  form: UseFormReturnType<MonsterFormValues>;
}

function AbilitiesSection({ form }: AbilitiesSectionProps) {
  return (
    <Fieldset legend="Характеристики">
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm">
        {ABILITY_SCORES.map((ability) => (
          <AbilityField key={ability} form={form} ability={ability} />
        ))}
      </SimpleGrid>
      <Text size="xs" c="dimmed" mt="xs">
        Бонус спасброска — как в книге. Пока вы его не меняли, он равен
        модификатору.
      </Text>
    </Fieldset>
  );
}

export default memo(AbilitiesSection, formErrorsEqual);
