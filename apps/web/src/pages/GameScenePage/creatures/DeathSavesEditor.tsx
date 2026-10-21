import { Group, Stack, Text, UnstyledButton } from '@mantine/core';
import classes from './creatures.module.css';

interface DeathSavesEditorProps {
  successes: number;
  failures: number;
  busy: boolean;
  onChange: (successes: number, failures: number) => void;
}

// Спасброски от смерти в карточке персонажа на нуле хитов: бросок делают за столом, здесь
// отмечают результат. Щелчок по кружку ставит счёт до него, по последнему отмеченному —
// снимает его (docs/dnd/combat-stats.md).
function DeathSavesEditor({
  successes,
  failures,
  busy,
  onChange,
}: DeathSavesEditorProps) {
  const row = (
    label: string,
    count: number,
    kind: 'success' | 'failure',
    set: (n: number) => void,
  ) => (
    <Group
      gap={2}
      wrap="nowrap"
      role="group"
      aria-label={`${label}: ${count} из 3`}
    >
      <Text size="xs" w={60}>
        {label}
      </Text>
      {[1, 2, 3].map((n) => (
        <UnstyledButton
          key={n}
          className={classes.pipButton}
          disabled={busy}
          aria-label={`${label}: ${n}`}
          aria-pressed={n <= count}
          onClick={() => set(n === count ? n - 1 : n)}
        >
          <span
            className={classes.savePip}
            data-kind={kind}
            data-full={n <= count || undefined}
          />
        </UnstyledButton>
      ))}
    </Group>
  );
  return (
    <Stack gap={0}>
      <Text size="xs" c="dimmed">
        Спасброски от смерти
      </Text>
      {row('Успехи', successes, 'success', (n) => onChange(n, failures))}
      {row('Провалы', failures, 'failure', (n) => onChange(successes, n))}
    </Stack>
  );
}

export default DeathSavesEditor;
