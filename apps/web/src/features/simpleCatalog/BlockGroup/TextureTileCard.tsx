import { Button, FileButton, Group, Stack, Text } from '@mantine/core';
import { ownTileImage } from '../../maps';

const IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

interface TextureTileCardProps {
  tile: string;
  // «Верх», «Бок», «Низ» или «Все грани».
  label: string;
  alt: string;
  // Что задают кнопки, для их подписей: «текстуру» или «текстуру: верх».
  target: string;
  reading: boolean;
  disabled: boolean;
  onUpload: (file: File | null) => void;
  onDraw: () => void;
}

// Плитка одной грани в форме блока: картинка и два способа её задать — загрузить
// картинку или нарисовать в пиксельном редакторе (docs/plan/blocks.md, этапы 4б и 5).
function TextureTileCard(props: TextureTileCardProps) {
  const { tile, label, alt, target, reading, disabled, onUpload, onDraw } =
    props;
  return (
    <Stack gap={4} align="center">
      <img
        src={ownTileImage(tile)}
        alt={alt}
        width={64}
        height={64}
        style={{
          imageRendering: 'pixelated',
          borderRadius: 4,
          boxShadow: 'inset 0 0 0 1px var(--mantine-color-default-border)',
          background:
            'repeating-conic-gradient(var(--mantine-color-default-hover) 0 25%, transparent 0 50%) 0 0 / 16px 16px',
        }}
      />
      <Text size="xs" c="dimmed">
        {label}
      </Text>
      <Group gap={4} wrap="nowrap">
        <Button
          size="compact-xs"
          variant="default"
          disabled={disabled || reading}
          aria-label={`Нарисовать ${target}`}
          onClick={onDraw}
        >
          Рисовать
        </Button>
        <FileButton accept={IMAGE_TYPES} onChange={onUpload}>
          {(fileProps) => (
            <Button
              {...fileProps}
              size="compact-xs"
              variant="default"
              loading={reading}
              disabled={disabled}
              aria-label={`Загрузить ${target}`}
            >
              Загрузить
            </Button>
          )}
        </FileButton>
      </Group>
    </Stack>
  );
}

export default TextureTileCard;
