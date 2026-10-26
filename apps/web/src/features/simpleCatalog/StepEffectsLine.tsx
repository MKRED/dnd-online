import { Text } from '@mantine/core';
import { Fragment } from 'react';
import { RecordLink } from '../catalog';
import type { StepEffectOutcome } from 'shared';

// Строка эффектов исхода в карточке способности: «Попадание: «Отравлен»». Название —
// ссылка на карточку эффекта; скрытый автором от читателя — без названия и ссылки.
function StepEffectsLine({ outcome }: { outcome: StepEffectOutcome }) {
  return (
    <Text size="sm" span display="block">
      {outcome.label}:{' '}
      {outcome.effects.map(({ effectId, effect }, index) => (
        <Fragment key={effectId}>
          {index > 0 && ', '}
          {effect ? (
            <RecordLink
              kind="effect"
              id={effectId}
              name={effect.name}
              size="sm"
            >
              {effect.name}
            </RecordLink>
          ) : (
            <Text span size="sm" c="dimmed">
              скрыт автором
            </Text>
          )}
        </Fragment>
      ))}
    </Text>
  );
}

export default StepEffectsLine;
