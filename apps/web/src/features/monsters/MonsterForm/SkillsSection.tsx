import {
  ActionIcon,
  Button,
  Fieldset,
  Grid,
  NumberInput,
  Select,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo, useState } from 'react';
import {
  SKILL_ABILITIES,
  challengeProficiencyBonus,
  getAbilityModifier,
  type Skill,
} from 'shared';
import { formErrorsEqual } from '../../../components/form';
import { SKILL_LABELS } from '../../characters';
import type { MonsterFormValues } from './monsterFormValues';
import { useRowIds } from './useRowIds';

const SKILL_OPTIONS = (Object.keys(SKILL_LABELS) as Skill[])
  .map((value) => ({ value, label: SKILL_LABELS[value] }))
  .sort((a, b) => a.label.localeCompare(b.label, 'ru'));

// Бонус навыка, которым монстр владеет: модификатор + бонус мастерства по ПО. Так
// почти у всех монстров книги; если в книге иначе, мастер правит число.
function suggestedBonus(values: MonsterFormValues, skill: Skill) {
  const score = values.abilities[SKILL_ABILITIES[skill]].score;
  const modifier = typeof score === 'number' ? getAbilityModifier(score) : 0;
  return modifier + challengeProficiencyBonus(values.challenge);
}

interface SkillRowProps {
  form: UseFormReturnType<MonsterFormValues>;
  index: number;
}

function SkillRow({ form, index }: SkillRowProps) {
  const path = `skills.${index}`;
  // Бонус подставляется при выборе навыка — поле управляется отсюда.
  const [bonus, setBonus] = useState(
    () => form.getValues().skills[index].bonus,
  );
  const bonusError = form.errors[`${path}.bonus`];
  const setBonusValue = (value: number | string) => {
    form.setFieldValue(`${path}.bonus`, value);
    setBonus(value);
  };

  return (
    <Grid align="flex-start">
      <Grid.Col span={{ base: 12, xs: 6 }}>
        <Select
          label="Навык"
          placeholder="Выберите навык"
          data={SKILL_OPTIONS}
          searchable
          allowDeselect={false}
          nothingFoundMessage="Такого навыка нет"
          {...form.getInputProps(`${path}.skill`)}
          onChange={(value) => {
            form.setFieldValue(`${path}.skill`, value ?? '');
            if (value)
              setBonusValue(suggestedBonus(form.getValues(), value as Skill));
          }}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 8, xs: 4 }}>
        <NumberInput
          label="Бонус"
          allowDecimal={false}
          value={bonus}
          error={bonusError}
          data-path={`${path}.bonus`}
          onChange={setBonusValue}
        />
      </Grid.Col>
      <Grid.Col span={{ base: 4, xs: 2 }} pt={{ base: 34, xs: 34 }}>
        <ActionIcon
          color="red"
          variant="subtle"
          onClick={() => form.removeListItem('skills', index)}
          aria-label="Убрать навык"
        >
          ✕
        </ActionIcon>
      </Grid.Col>
    </Grid>
  );
}

interface SkillsSectionProps {
  form: UseFormReturnType<MonsterFormValues>;
}

function SkillsSection({ form }: SkillsSectionProps) {
  const ids = useRowIds(form, 'skills');
  return (
    <Fieldset legend="Навыки">
      <Stack gap="xs">
        {ids.length === 0 && (
          <Text size="sm" c="dimmed">
            Навыков нет.
          </Text>
        )}
        {ids.map((id, index) => (
          <SkillRow key={id} form={form} index={index} />
        ))}
        <Button
          variant="light"
          size="xs"
          style={{ alignSelf: 'flex-start' }}
          onClick={() =>
            form.insertListItem('skills', {
              id: crypto.randomUUID(),
              skill: '',
              bonus: 0,
            })
          }
        >
          Добавить навык
        </Button>
        <Text size="xs" c="dimmed">
          При выборе навыка бонус подставляется как модификатор + бонус
          мастерства. Если в книге иначе, поправьте число.
        </Text>
      </Stack>
    </Fieldset>
  );
}

export default memo(SkillsSection, formErrorsEqual);
