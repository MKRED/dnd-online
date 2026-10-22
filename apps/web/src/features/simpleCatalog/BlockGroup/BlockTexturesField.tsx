import {
  Alert,
  Button,
  FileButton,
  Group,
  SegmentedControl,
  Stack,
  Text,
} from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useState } from 'react';
import {
  decodeTextures,
  downscaleTile,
  meanTextureColor,
  ownTileImage,
  tileToBase64,
} from '../../maps';
import type { SimpleFormValues } from '../SimpleEntryForm/simpleEntryValues';
import {
  textureModeOf,
  texturesForMode,
  withUploadedTile,
  type TextureFace,
  type TextureMode,
} from './blockTextureForm';
import { ImageTooLargeError, readImagePixels } from './readImagePixels';

const MODES: { value: TextureMode; label: string }[] = [
  { value: 'pattern', label: 'Узор основы' },
  { value: 'single', label: 'Одна на все грани' },
  { value: 'faces', label: 'Верх, бок, низ' },
];

const FACE_LABELS: Record<TextureFace, string> = {
  top: 'Верх',
  side: 'Бок',
  bottom: 'Низ',
};

const IMAGE_TYPES = 'image/png,image/jpeg,image/webp,image/gif';

// Свои текстуры группы (docs/plan/blocks.md, этап 4б). Картинка сжимается до 16×16 в
// браузере и уходит вместе с формой; основной цвет становится её средним цветом.
function BlockTexturesField({
  form,
}: {
  form: UseFormReturnType<SimpleFormValues>;
}) {
  const { textures } = form.getValues().block;
  const mode = textureModeOf(textures);
  // «Верх, бок, низ» с тремя одинаковыми плитками выглядит как «одна на все» — выбор
  // держим сами, пока пользователь не загрузил разные.
  const [chosen, setChosen] = useState<TextureMode>(mode);
  const shown = chosen === 'faces' && textures ? 'faces' : mode;
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<TextureFace | null>(null);

  // Переход к «одной на все» оставляет боковую плитку, к узору — убирает свои
  // текстуры совсем; до сохранения формы это отменяется кнопкой «Отмена».
  const changeMode = (next: TextureMode) => {
    setChosen(next);
    setError(null);
    const values = form.getValues().block;
    form.setFieldValue(
      'block.textures',
      texturesForMode(next, values.textures, values.look, values.color),
    );
  };

  // Пока картинка читается, кнопки загрузки и смена способа заблокированы, а текстуры
  // перечитываются после чтения: иначе две быстрые загрузки затёрли бы друг друга.
  const upload = (face: TextureFace, file: File | null) => {
    if (!file || !form.getValues().block.textures) return;
    setError(null);
    setReading(face);
    readImagePixels(file)
      .then(({ rgba, width, height }) => {
        const current = form.getValues().block.textures;
        if (!current) return;
        const tile = tileToBase64(downscaleTile(rgba, width, height));
        const next = withUploadedTile(shown, current, face, tile);
        form.setFieldValue('block.textures', next);
        form.setFieldValue(
          'block.color',
          meanTextureColor(decodeTextures(next)),
        );
      })
      .catch((err: unknown) => {
        console.error('Failed to read block texture image', err);
        setError(
          err instanceof ImageTooLargeError
            ? err.message
            : 'Не удалось прочитать картинку: нужен PNG, JPEG, WebP или GIF',
        );
      })
      .finally(() => setReading(null));
  };

  const faces: TextureFace[] =
    shown === 'single' ? ['side'] : ['top', 'side', 'bottom'];

  return (
    <Stack gap="xs">
      <Text size="sm" fw={500}>
        Текстуры
      </Text>
      <SegmentedControl
        data={MODES}
        value={shown}
        onChange={changeMode}
        aria-label="Текстуры"
        disabled={reading !== null}
        fullWidth
        maw={460}
      />
      {textures && (
        <>
          <Group gap="md" align="flex-start">
            {faces.map((face) => (
              <Stack key={face} gap={4} align="center">
                <img
                  src={ownTileImage(textures[face])}
                  alt={
                    shown === 'single'
                      ? 'Текстура всех граней'
                      : `Текстура: ${FACE_LABELS[face].toLowerCase()}`
                  }
                  width={64}
                  height={64}
                  style={{
                    imageRendering: 'pixelated',
                    borderRadius: 4,
                    boxShadow:
                      'inset 0 0 0 1px var(--mantine-color-default-border)',
                    background:
                      'repeating-conic-gradient(var(--mantine-color-default-hover) 0 25%, transparent 0 50%) 0 0 / 16px 16px',
                  }}
                />
                <Text size="xs" c="dimmed">
                  {shown === 'single' ? 'Все грани' : FACE_LABELS[face]}
                </Text>
                <FileButton
                  accept={IMAGE_TYPES}
                  onChange={(file) => upload(face, file)}
                >
                  {(props) => (
                    <Button
                      {...props}
                      size="compact-xs"
                      variant="default"
                      loading={reading === face}
                      disabled={reading !== null && reading !== face}
                      aria-label={
                        shown === 'single'
                          ? 'Загрузить текстуру'
                          : `Загрузить текстуру: ${FACE_LABELS[face].toLowerCase()}`
                      }
                    >
                      Загрузить
                    </Button>
                  )}
                </FileButton>
              </Stack>
            ))}
          </Group>
          <Text size="xs" c="dimmed">
            Картинка сожмётся до 16×16 пикселей: возьмётся квадрат из середины.
            Прозрачные пиксели станут дырами насквозь, как у листвы.
          </Text>
        </>
      )}
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
    </Stack>
  );
}

export default BlockTexturesField;
