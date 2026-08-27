import { Fieldset, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { memo, useCallback, useState } from 'react';
import { ABILITY_SCORES } from 'shared';
import type { CharacterFormValues } from '../../../features/characters';
import { formErrorsEqual } from '../formSectionMemo';
import AbilityCard from './AbilityCard';
import classes from './AbilityScoresSection.module.css';

interface AbilityScoresSectionProps {
  form: UseFormReturnType<CharacterFormValues>;
}

function AbilityScoresSection({ form }: AbilityScoresSectionProps) {
  const [proficiencyBonus, setProficiencyBonus] = useState(
    () => form.getValues().proficiencyBonus,
  );
  form.watch(
    'proficiencyBonus',
    // См. аналогичный комментарий в AbilityCard про '' во время редактирования NumberInput.
    useCallback(({ value }: { value: number | string }) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        setProficiencyBonus(value);
      }
    }, []),
  );

  return (
    <Fieldset legend="Характеристики и навыки">
      <div className={classes.columns}>
        {ABILITY_SCORES.map((ability) => (
          <div key={ability} className={classes.item}>
            <AbilityCard
              form={form}
              ability={ability}
              proficiencyBonus={proficiencyBonus}
            />
          </div>
        ))}
      </div>
      <Text size="xs" c="dimmed" mt="xs">
        Модификаторы, бонусы спасбросков и навыков считаются автоматически:
        модификатор характеристики + бонус мастерства при владении (×2 при
        экспертизе).
      </Text>
    </Fieldset>
  );
}

export default memo(AbilityScoresSection, formErrorsEqual);
