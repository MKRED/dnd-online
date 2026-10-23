import { Paper, SegmentedControl, Tooltip } from '@mantine/core';
import type { SceneMode } from './useSceneMode';

interface SceneModeSwitchProps {
  mode: SceneMode;
  onChange: (mode: SceneMode) => void;
  // В шапке панели на телефоне: мельче и без подсказки — на касание она залипала.
  compact?: boolean;
}

const MODES = [
  { value: 'play', label: 'Игра' },
  { value: 'edit', label: 'Правка' },
];

// Переключатель «Игра | Правка» на сцене, рядом с отменой (docs/plan/scene-page.md):
// на сцене, а не в панели — свёрнутая панель его бы прятала.
function SceneModeSwitch({ mode, onChange, compact }: SceneModeSwitchProps) {
  const control = (
    <SegmentedControl
      aria-label="Режим мастера"
      size={compact ? 'xs' : 'sm'}
      data={MODES}
      value={mode}
      onChange={(value) => onChange(value === 'edit' ? 'edit' : 'play')}
    />
  );
  if (compact) return control;
  return (
    <Tooltip
      label="Игра — ходы и справка, правка — карта и перестановка без хода. Клавиша Ё"
      withArrow
      position="bottom-start"
      multiline
      w={260}
    >
      <Paper withBorder shadow="xs" p={4}>
        {control}
      </Paper>
    </Tooltip>
  );
}

export default SceneModeSwitch;
