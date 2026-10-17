import { Chip, Group, Text } from '@mantine/core';
import { formatSpellLevel } from 'shared';

interface LevelChipsProps {
  // Круги заклинаний вкладки (с повторами) — по ним чипы и числа.
  levels: number[];
  value: number[];
  onChange: (levels: number[]) => void;
}

// Круги заклинаний чипами с числом записей. Чипы только тех кругов, что есть во вкладке
// (и выбранных — чтобы выбор можно было снять). Ничего не выбрано — все круги.
function LevelChips({ levels, value, onChange }: LevelChipsProps) {
  const shown = [...new Set([...levels, ...value])].sort((a, b) => a - b);
  const count = (level: number) => levels.filter((l) => l === level).length;

  return (
    <Group gap={6} role="group" aria-label="Круг">
      <Text size="sm" c="dimmed">
        Круг
      </Text>
      <Chip.Group
        multiple
        value={value.map(String)}
        onChange={(next) => onChange(next.map(Number).sort((a, b) => a - b))}
      >
        {shown.map((level) => (
          <Chip key={level} value={String(level)} size="sm">
            {/* «1 круг», а не «1»: рядом число записей, голые цифры сливаются. */}
            {formatSpellLevel(level)}{' '}
            <Text span size="xs" c="inherit" opacity={0.7}>
              {count(level)}
            </Text>
          </Chip>
        ))}
      </Chip.Group>
    </Group>
  );
}

export default LevelChips;
