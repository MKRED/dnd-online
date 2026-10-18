import { Anchor, Text } from '@mantine/core';
import { Fragment } from 'react';
import { Link } from 'react-router-dom';
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
            <Anchor component={Link} to={`/effects/${effectId}`} size="sm">
              {effect.name}
            </Anchor>
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
