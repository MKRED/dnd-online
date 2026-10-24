import { Kbd, Paper, Text } from '@mantine/core';
import classes from './ScenePlaque.module.css';

export interface PlaqueState {
  name: string;
  // Запас, если он сейчас важен: «осталось 20 из 30 фт».
  left: string | null;
  // То же коротко для телефона: «5 / 40 фт».
  short?: string;
  // Что делает щелчок: «щелчок по клетке — ход».
  hint: string;
}

// Плашка выбранного на сцене (docs/plan/scene-page.md, этап 2): кто выбран, сколько осталось
// и что сделает щелчок. Стоит на сцене, а не в панели — видна и при свёрнутой панели.
// raised — внизу полоса инструментов «Правки», плашка над ней.
function ScenePlaque({
  state,
  raised,
  inline,
}: {
  state: PlaqueState | null;
  raised: boolean;
  // В строке координат «Правки» — без своего места на сцене.
  inline?: boolean;
}) {
  if (!state) return null;
  return (
    <Paper
      className={classes.plaque}
      data-raised={raised || undefined}
      data-inline={inline || undefined}
      withBorder
      shadow="sm"
      role="status"
      aria-label="Выбрано на сцене"
    >
      <Text size="sm" fw={600} truncate className={classes.name}>
        {state.name}
      </Text>
      {state.left && (
        <Text
          size="sm"
          fw={600}
          c="var(--mantine-primary-color-filled)"
          className={classes.left}
        >
          <span className={classes.long}>{state.left}</span>
          <span className={classes.short}>{state.short ?? state.left}</span>
        </Text>
      )}
      <Text size="sm" c="dimmed" truncate className={classes.hint}>
        {state.hint}
      </Text>
      <Kbd size="xs" className={classes.esc}>
        Esc
      </Kbd>
    </Paper>
  );
}

export default ScenePlaque;
