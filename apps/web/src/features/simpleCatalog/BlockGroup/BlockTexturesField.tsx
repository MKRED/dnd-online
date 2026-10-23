import { Alert, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import { useState } from 'react';
import {
  decodeTextures,
  downscaleTile,
  meanTextureColor,
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
import TextureTileCard from './TextureTileCard';
import { TileEditorModal, type TileEditorTarget } from './TileEditor';

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

// Свои текстуры группы (docs/plan/blocks.md, этапы 4б и 5). Плитку загружают картинкой
// (сжимается до 16×16 в браузере) или рисуют в пиксельном редакторе; она уходит вместе
// с формой, а основной цвет становится средним цветом текстур.
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
  const [drawing, setDrawing] = useState<TileEditorTarget | null>(null);

  // Новая плитка грани — из загрузки или из редактора; текстуры берутся свежие из формы.
  const applyTile = (face: TextureFace, tile: string) => {
    const current = form.getValues().block.textures;
    if (!current) return;
    const next = withUploadedTile(shown, current, face, tile);
    form.setFieldValue('block.textures', next);
    form.setFieldValue('block.color', meanTextureColor(decodeTextures(next)));
  };

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
      .then(({ rgba, width, height }) =>
        applyTile(face, tileToBase64(downscaleTile(rgba, width, height))),
      )
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
            {faces.map((face) => {
              const single = shown === 'single';
              const faceName = FACE_LABELS[face].toLowerCase();
              return (
                <TextureTileCard
                  key={face}
                  tile={textures[face]}
                  label={single ? 'Все грани' : FACE_LABELS[face]}
                  alt={
                    single ? 'Текстура всех граней' : `Текстура: ${faceName}`
                  }
                  target={single ? 'текстуру' : `текстуру: ${faceName}`}
                  reading={reading === face}
                  disabled={reading !== null && reading !== face}
                  onUpload={(file) => upload(face, file)}
                  onDraw={() =>
                    setDrawing({
                      face,
                      mode: shown,
                      title: single
                        ? 'Текстура всех граней'
                        : `Текстура: ${faceName}`,
                    })
                  }
                />
              );
            })}
          </Group>
          <Text size="xs" c="dimmed">
            Нарисуйте плитку 16×16 или загрузите картинку — она сожмётся до
            16×16, возьмётся квадрат из середины. Прозрачные пиксели станут
            дырами насквозь, как у листвы.
          </Text>
        </>
      )}
      <TileEditorModal
        target={drawing}
        textures={textures}
        look={form.getValues().block.look}
        color={form.getValues().block.color}
        onDone={applyTile}
        onClose={() => setDrawing(null)}
      />
      {error && (
        <Alert color="red" p="xs">
          {error}
        </Alert>
      )}
    </Stack>
  );
}

export default BlockTexturesField;
