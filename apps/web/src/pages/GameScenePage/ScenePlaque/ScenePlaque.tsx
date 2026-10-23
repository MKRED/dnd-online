import { Kbd, Paper, Text } from '@mantine/core';
import classes from './ScenePlaque.module.css';

export interface PlaqueState {
  name: string;
  // Запас, если он сейчас важен: «осталось 20 из 30 фт».
  left: string | null;
  // Что делает щелчок: «щелчок по клетке — ход».
  hint: string;
}

// Плашка выбранного на сцене (docs/plan/scene-page.md, этап 2): кто выбран, сколько осталось
// и что сделает щелчок. Стоит на сцене, а не в панели — видна и при свёрнутой панели.
function ScenePlaque({ state }: { state: PlaqueState | null }) {
  if (!state) return null;
  return (
    <Paper
      className={classes.plaque}
      withBorder
      shadow="sm"
      role="status"
      aria-label="Выбрано на сцене"
    >
      <Text size="sm" fw={600} truncate>
        {state.name}
      </Text>
      {state.left && (
        <Text size="sm" fw={600} c="var(--mantine-primary-color-filled)">
          {state.left}
        </Text>
      )}
      <Text size="sm" c="dimmed" className={classes.hint}>
        {state.hint}
      </Text>
      <Kbd size="xs">Esc</Kbd>
    </Paper>
  );
}

export default ScenePlaque;
