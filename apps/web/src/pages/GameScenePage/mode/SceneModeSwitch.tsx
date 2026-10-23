import { Paper, SegmentedControl, Tooltip } from '@mantine/core';
import type { SceneMode } from './useSceneMode';

interface SceneModeSwitchProps {
  mode: SceneMode;
  onChange: (mode: SceneMode) => void;
}

const MODES = [
  { value: 'play', label: 'Игра' },
  { value: 'edit', label: 'Правка' },
];

// Переключатель «Игра | Правка» на сцене, рядом с отменой (docs/plan/scene-page.md):
// на сцене, а не в панели — свёрнутая панель его бы прятала.
function SceneModeSwitch({ mode, onChange }: SceneModeSwitchProps) {
  return (
    <Tooltip
      label="Игра — ходы и справка, правка — карта и перестановка без хода. Клавиша Ё"
      withArrow
      position="bottom-start"
      multiline
      w={260}
    >
      <Paper withBorder shadow="xs" p={4}>
        <SegmentedControl
          aria-label="Режим мастера"
          data={MODES}
          value={mode}
          onChange={(value) => onChange(value === 'edit' ? 'edit' : 'play')}
        />
      </Paper>
    </Tooltip>
  );
}

export default SceneModeSwitch;
