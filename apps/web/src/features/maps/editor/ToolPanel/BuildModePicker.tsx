import { SegmentedControl, Stack } from '@mantine/core';
import { BUILD_MODE_LABELS, BUILD_MODES, type BuildMode } from '../editorTools';
import SectionLabel from './SectionLabel';

// Режим «Строить» (вариант Б артборда «Н4», 2026-10-24, docs/plan/done/scene-page.md):
// по одному блоку или объекту, сплошной областью или коробкой со стенками. Клавиша 2
// при «Строить» — следующий режим.
function BuildModePicker({
  mode,
  onChange,
}: {
  mode: BuildMode;
  onChange: (mode: BuildMode) => void;
}) {
  return (
    <Stack gap={6}>
      <SectionLabel title="Как" hotkey="2" />
      <SegmentedControl
        size="xs"
        fullWidth
        aria-label="Режим «Строить»"
        data={BUILD_MODES.map((value) => ({
          value,
          label: BUILD_MODE_LABELS[value],
        }))}
        value={mode}
        onChange={(value) => onChange(value)}
      />
    </Stack>
  );
}

export default BuildModePicker;
