import { ActionIcon, SimpleGrid, Stack, Text } from '@mantine/core';
import type { Facing } from 'shared';

// Направления по местам на компасе 3 × 3, север сверху — как на карте и в панели
// размера. Середина пустая.
// prettier-ignore
const COMPASS: (Facing | null)[] = [
  315, 0, 45,
  270, null, 90,
  225, 180, 135,
];

const ARROWS: Record<Facing, string> = {
  0: '↑',
  45: '↗',
  90: '→',
  135: '↘',
  180: '↓',
  225: '↙',
  270: '←',
  315: '↖',
};

const NAMES: Record<Facing, string> = {
  0: 'север',
  45: 'северо-восток',
  90: 'восток',
  135: 'юго-восток',
  180: 'юг',
  225: 'юго-запад',
  270: 'запад',
  315: 'северо-запад',
};

interface FacingPickerProps {
  value: Facing;
  onChange: (facing: Facing) => void;
  disabled?: boolean;
}

// Взгляд старта или существа — 8 направлений, правило дома (docs/dnd/facing.md).
function FacingPicker({ value, onChange, disabled }: FacingPickerProps) {
  return (
    <Stack gap={4}>
      <Text size="sm">Взгляд (R): {NAMES[value]}</Text>
      <SimpleGrid cols={3} spacing={2} verticalSpacing={2} w={104}>
        {COMPASS.map((facing, index) =>
          facing === null ? (
            <div key={index} />
          ) : (
            <ActionIcon
              key={facing}
              size="md"
              variant={facing === value ? 'filled' : 'default'}
              aria-label={`Взгляд: ${NAMES[facing]}`}
              aria-pressed={facing === value}
              disabled={disabled}
              onClick={() => onChange(facing)}
            >
              {ARROWS[facing]}
            </ActionIcon>
          ),
        )}
      </SimpleGrid>
    </Stack>
  );
}

export default FacingPicker;
