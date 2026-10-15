import { Fieldset, Stack, Text } from '@mantine/core';
import type { Character } from 'shared';

function PersonalityView({ character }: { character: Character }) {
  const { personality } = character;
  const rows = (
    [
      ['traits', 'Черты характера'],
      ['ideals', 'Идеалы'],
      ['bonds', 'Привязанности'],
      ['flaws', 'Слабости'],
      ['appearance', 'Внешность'],
      ['backstory', 'Предыстория'],
    ] as const
  ).filter(([key]) => personality[key]?.trim());
  if (rows.length === 0) return null;

  return (
    <Fieldset legend="Личность">
      <Stack gap="sm">
        {rows.map(([key, label]) => (
          <div key={key}>
            <Text size="sm" c="dimmed">
              {label}
            </Text>
            <Text
              size="sm"
              style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}
            >
              {personality[key]}
            </Text>
          </div>
        ))}
      </Stack>
    </Fieldset>
  );
}

export default PersonalityView;
