import { Group, Paper, Text } from '@mantine/core';
import classes from './CharacterSheet.module.css';

interface DeathSavesTileProps {
  successes: number;
  failures: number;
}

// Спасброски от смерти: по три кружка успехов и провалов. Три успеха — персонаж стабилен,
// три провала — умер; при любом лечении счёт обнуляется (docs/dnd/combat-stats.md).
function DeathSavesTile({ successes, failures }: DeathSavesTileProps) {
  return (
    <Paper
      withBorder
      radius="md"
      p="xs"
      ta="center"
      className={classes.wideTile}
      role="group"
      aria-label={`Спасброски от смерти: успехов ${successes} из 3, провалов ${failures} из 3`}
    >
      <Text size="xs" c="dimmed">
        Спасброски от смерти
      </Text>
      <Group justify="center" gap="md" mt={4} aria-hidden>
        <Pips label="Успехи" count={successes} kind="success" />
        <Pips label="Провалы" count={failures} kind="failure" />
      </Group>
    </Paper>
  );
}

function Pips({
  label,
  count,
  kind,
}: {
  label: string;
  count: number;
  kind: 'success' | 'failure';
}) {
  return (
    <Group gap={4} wrap="nowrap">
      <Text size="xs">{label}</Text>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={classes.savePip}
          data-kind={kind}
          data-full={i < count || undefined}
        />
      ))}
    </Group>
  );
}

export default DeathSavesTile;
