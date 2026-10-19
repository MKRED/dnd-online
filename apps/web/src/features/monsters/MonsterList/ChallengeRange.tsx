import { Group, Select, Text } from '@mantine/core';
import { MONSTER_CHALLENGES, type MonsterChallenge } from 'shared';

const OPTIONS = MONSTER_CHALLENGES.map((value) => ({ value, label: value }));

interface ChallengeRangeProps {
  min: MonsterChallenge | null;
  max: MonsterChallenge | null;
  onChange: (
    min: MonsterChallenge | null,
    max: MonsterChallenge | null,
  ) => void;
}

// ПО «от» и «до». Пустая граница — без предела; крестик в поле её снимает.
function ChallengeRange({ min, max, onChange }: ChallengeRangeProps) {
  const field = {
    data: OPTIONS,
    placeholder: 'Любой',
    clearable: true,
    searchable: true,
    nothingFoundMessage: 'ПО — от 0 до 30',
    w: 110,
    size: 'sm',
  } as const;
  return (
    <Group gap={6} role="group" aria-label="Показатель опасности">
      <Text size="sm" c="dimmed">
        ПО от
      </Text>
      <Select
        aria-label="ПО от"
        value={min}
        onChange={(value) => onChange(value, max)}
        {...field}
      />
      <Text size="sm" c="dimmed">
        до
      </Text>
      <Select
        aria-label="ПО до"
        value={max}
        onChange={(value) => onChange(min, value)}
        {...field}
      />
    </Group>
  );
}

export default ChallengeRange;
