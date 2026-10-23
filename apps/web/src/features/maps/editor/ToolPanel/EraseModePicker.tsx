import { Radio, Stack, Text } from '@mantine/core';
import { ERASE_MODE_LABELS, ERASE_MODES, type EraseMode } from '../eraseModes';
import { ERASE_MODE_SUMMARIES } from './toolTexts';

interface EraseModePickerProps {
  mode: EraseMode;
  onChange: (mode: EraseMode) => void;
}

// Режимы ластика строками с пояснением (docs/plan/scene-page.md, этап 3): раньше были
// четыре слова в SegmentedControl, и что делает «Связное», было не понять.
function EraseModePicker({ mode, onChange }: EraseModePickerProps) {
  return (
    <Radio.Group value={mode} onChange={onChange} label="Режим">
      <Stack gap={6} mt={6}>
        {ERASE_MODES.map((value) => (
          <Radio.Card key={value} value={value} radius="md" p="xs">
            <Radio.Indicator style={{ float: 'left', marginTop: 2 }} />
            <div style={{ marginLeft: 30 }}>
              <Text size="sm" fw={600}>
                {ERASE_MODE_LABELS[value]}
              </Text>
              <Text size="xs" c="dimmed">
                {ERASE_MODE_SUMMARIES[value]}
              </Text>
            </div>
          </Radio.Card>
        ))}
      </Stack>
    </Radio.Group>
  );
}

export default EraseModePicker;
