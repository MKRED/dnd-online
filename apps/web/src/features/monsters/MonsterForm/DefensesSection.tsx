import { Fieldset, Grid, MultiSelect } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import {
  CONDITION_KINDS,
  CONDITION_LABELS,
  DAMAGE_TYPES,
  DAMAGE_TYPE_LABELS,
} from 'shared';
import { formErrorsEqual } from '../../../components/form';
import type { MonsterFormValues } from './monsterFormValues';

const DAMAGE_OPTIONS = DAMAGE_TYPES.map((value) => ({
  value,
  label: DAMAGE_TYPE_LABELS[value],
}));
const CONDITION_OPTIONS = CONDITION_KINDS.map((value) => ({
  value,
  label: CONDITION_LABELS[value],
}));

const FIELDS = [
  ['vulnerabilities', 'Уязвимости', DAMAGE_OPTIONS],
  ['resistances', 'Сопротивления', DAMAGE_OPTIONS],
  ['immunities', 'Иммунитеты к урону', DAMAGE_OPTIONS],
  ['conditionImmunities', 'Иммунитеты к состояниям', CONDITION_OPTIONS],
] as const;

// Виды урона и состояния — из готовых списков: по ним потом будет считать бой.
function DefensesSection({
  form,
}: {
  form: UseFormReturnType<MonsterFormValues>;
}) {
  return (
    <Fieldset legend="Защита">
      <Grid>
        {FIELDS.map(([path, label, data]) => (
          <Grid.Col key={path} span={{ base: 12, sm: 6 }}>
            <MultiSelect
              label={label}
              placeholder="Нет"
              data={data}
              searchable
              hidePickedOptions
              nothingFoundMessage="Ничего не нашлось"
              // Enter в поиске без совпадений иначе отправляет всю форму.
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.preventDefault();
              }}
              {...form.getInputProps(path)}
            />
          </Grid.Col>
        ))}
      </Grid>
    </Fieldset>
  );
}

export default memo(DefensesSection, formErrorsEqual);
