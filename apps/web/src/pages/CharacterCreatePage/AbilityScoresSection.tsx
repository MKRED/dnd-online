import {
  Checkbox,
  Fieldset,
  Grid,
  NumberInput,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo } from 'react';
import { ABILITY_SCORES } from 'shared';
import {
  ABILITY_LABELS,
  type CharacterFormValues,
} from '../../features/characters';
import { formErrorsEqual } from './formSectionMemo';

interface AbilityScoresSectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

function AbilityScoresSection({ form }: AbilityScoresSectionProps) {
  return (
    <Fieldset legend="Характеристики">
      <Grid>
        {ABILITY_SCORES.map((ability) => (
          <Grid.Col key={ability} span={{ base: 6, sm: 4 }}>
            <Stack gap={4}>
              <NumberInput
                label={ABILITY_LABELS[ability]}
                min={1}
                max={30}
                {...form.getInputProps(`abilityScores.${ability}`)}
              />
              <Checkbox
                label="Спасбросок"
                {...form.getInputProps(`savingThrows.${ability}`, {
                  type: 'checkbox',
                })}
              />
            </Stack>
          </Grid.Col>
        ))}
      </Grid>
      <Text size="xs" c="dimmed" mt="xs">
        Отметьте владение спасброском там, где оно даётся классом.
      </Text>
    </Fieldset>
  );
}

export default memo(AbilityScoresSection, formErrorsEqual);
