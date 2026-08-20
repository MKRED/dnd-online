import { Checkbox, Fieldset, Table } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo, useCallback, useState } from 'react';
import { SKILL_ABILITIES, type Skill } from 'shared';
import {
  ABILITY_LABELS,
  SKILL_LABELS,
  type CharacterFormValues,
} from '../../features/characters';
import { formErrorsEqual } from './formSectionMemo';

interface SkillsSectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

const SKILLS = Object.keys(SKILL_ABILITIES) as Skill[];

function SkillsSection({ form }: SkillsSectionProps) {
  return (
    <Fieldset legend="Навыки">
      <Table striped highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Навык</Table.Th>
            <Table.Th>Характеристика</Table.Th>
            <Table.Th>Владение</Table.Th>
            <Table.Th>Эксперт.</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {SKILLS.map((skill) => (
            <SkillRow key={skill} form={form} skill={skill} />
          ))}
        </Table.Tbody>
      </Table>
    </Fieldset>
  );
}

interface SkillRowProps {
  form: UseFormReturnType<CharacterFormValues>;
  skill: Skill;
}

// Форма работает в uncontrolled-режиме (см. CharacterCreatePage) — обычный чек-бокс
// сам не вызывает перерисовку. Чтобы чек-бокс "Эксперт." оставался блокирован/разблокирован
// вслед за "Владением" без перерисовки всей таблицы на каждое нажатие клавиши где-либо
// в форме, подписываемся точечно на изменение конкретного поля через form.watch.
function SkillRow({ form, skill }: SkillRowProps) {
  const [proficient, setProficient] = useState(
    () => form.getValues().skills[skill].proficient,
  );
  form.watch(
    `skills.${skill}.proficient`,
    useCallback(({ value }: { value: boolean }) => setProficient(value), []),
  );

  return (
    <Table.Tr>
      <Table.Td>{SKILL_LABELS[skill]}</Table.Td>
      <Table.Td>{ABILITY_LABELS[SKILL_ABILITIES[skill]]}</Table.Td>
      <Table.Td>
        <Checkbox
          {...form.getInputProps(`skills.${skill}.proficient`, {
            type: 'checkbox',
          })}
        />
      </Table.Td>
      <Table.Td>
        <Checkbox
          disabled={!proficient}
          {...form.getInputProps(`skills.${skill}.expertise`, {
            type: 'checkbox',
          })}
        />
      </Table.Td>
    </Table.Tr>
  );
}

export default memo(SkillsSection, formErrorsEqual);
