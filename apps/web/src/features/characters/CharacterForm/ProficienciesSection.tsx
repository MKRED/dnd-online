import {
  Checkbox,
  Fieldset,
  Grid,
  Group,
  MultiSelect,
  TagsInput,
  Textarea,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import { ARMOR_TRAINING_OPTIONS } from '../characterArmorTraining';
import type { CharacterFormValues } from '../characterFormValues';
import { LANGUAGE_SUGGESTIONS } from '../characterLanguages';
import { TOOL_SUGGESTIONS } from '../characterTools';
import {
  WEAPON_PROFICIENCY_OPTIONS,
  WEAPON_SUGGESTIONS,
} from '../characterWeapons';
import { formErrorsEqual } from '../../../components/form';

// Как у подкласса: книжные варианты подсказываем, но своё вписать можно.
const SUGGEST_PLACEHOLDER = 'Выберите или впишите своё';

interface ProficienciesSectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

function ProficienciesSection({ form }: ProficienciesSectionProps) {
  return (
    <Fieldset legend="Владения и снаряжение">
      <Grid>
        <Grid.Col span={12}>
          {/* Категорий по правилам всего четыре, поэтому галочки, а не свободный ввод. */}
          <Checkbox.Group
            label="Доспехи"
            {...form.getInputProps('armorProficiencies')}
          >
            <Group mt="xs" gap="lg">
              {ARMOR_TRAINING_OPTIONS.map(({ value, label }) => (
                <Checkbox key={value} value={value} label={label} />
              ))}
            </Group>
          </Checkbox.Group>
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          {/* Строгий выбор: своё оружие сюда вписать нельзя, для него есть «Прочие владения». */}
          <MultiSelect
            label="Оружие"
            placeholder="Выберите из списка"
            data={WEAPON_PROFICIENCY_OPTIONS}
            searchable
            nothingFoundMessage="Такого оружия в списке нет"
            // Enter в поиске без совпадений иначе отправляет всю форму.
            onKeyDown={(event) => {
              if (event.key === 'Enter') event.preventDefault();
            }}
            {...form.getInputProps('weaponProficiencies')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TagsInput
            label="Мастерство оружия"
            description="Оружие, свойство мастерства которого открыто персонажу"
            placeholder={SUGGEST_PLACEHOLDER}
            // Подсказка под полем, а не под заголовком: иначе поле съезжает вниз
            // относительно соседнего «Оружия».
            inputWrapperOrder={['label', 'input', 'description', 'error']}
            data={WEAPON_SUGGESTIONS}
            {...form.getInputProps('weaponMasteries')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TagsInput
            label="Инструменты"
            placeholder={SUGGEST_PLACEHOLDER}
            data={TOOL_SUGGESTIONS}
            {...form.getInputProps('toolProficiencies')}
          />
        </Grid.Col>
        <Grid.Col span={{ base: 12, sm: 6 }}>
          <TagsInput
            label="Языки"
            placeholder={SUGGEST_PLACEHOLDER}
            data={LANGUAGE_SUGGESTIONS}
            {...form.getInputProps('languages')}
          />
        </Grid.Col>
        <Grid.Col span={12}>
          <Textarea
            label="Прочие владения"
            description="Всё, чего нет в полях выше"
            autosize
            minRows={2}
            maxRows={6}
            maxLength={500}
            {...form.getInputProps('otherProficiencies')}
          />
        </Grid.Col>
      </Grid>
    </Fieldset>
  );
}

export default memo(ProficienciesSection, formErrorsEqual);
