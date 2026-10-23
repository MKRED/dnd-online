import { ColorInput, Group, Stack, Text } from '@mantine/core';
import { PIXEL_PALETTE } from './pixelPalette';
import classes from './TileEditor.module.css';

interface TilePaletteProps {
  color: string;
  // Цвета, которые уже есть в плитке: дорисовывать теми же.
  tileColors: string[];
  onColor: (color: string) => void;
}

function Swatches({
  colors,
  color,
  onColor,
  label,
}: TilePaletteProps & { colors: string[]; label: string }) {
  return (
    <Group gap={6} role="group" aria-label={label}>
      {colors.map((value) => (
        <button
          key={value}
          type="button"
          className={classes.swatch}
          style={{ background: value }}
          data-active={value === color || undefined}
          aria-label={`Цвет ${value}`}
          aria-pressed={value === color}
          title={value}
          onClick={() => onColor(value)}
        />
      ))}
    </Group>
  );
}

// Палитра: готовые ряды, цвета самой плитки и свой цвет (поле с пипеткой экрана там,
// где браузер её умеет).
function TilePalette(props: TilePaletteProps) {
  const { color, tileColors, onColor } = props;
  return (
    <Stack gap="xs">
      {PIXEL_PALETTE.map((row) => (
        <Swatches
          key={row.label}
          {...props}
          colors={row.colors}
          label={row.label}
        />
      ))}
      {tileColors.length > 0 && (
        <Stack gap={4}>
          <Text size="xs" c="dimmed">
            Цвета плитки
          </Text>
          <Swatches {...props} colors={tileColors} label="Цвета плитки" />
        </Stack>
      )}
      <ColorInput
        label="Свой цвет"
        size="xs"
        maw={200}
        format="hex"
        value={color}
        // Пустое или недописанное поле цвет не меняет: красить «ничем» нельзя.
        onChange={(value) => {
          if (/^#[0-9a-f]{6}$/i.test(value)) onColor(value.toLowerCase());
        }}
      />
    </Stack>
  );
}

export default TilePalette;
