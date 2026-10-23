import { Alert, Group, SegmentedControl, Stack, Text } from '@mantine/core';
import { useMediaQuery } from '@mantine/hooks';
import { useState } from 'react';
import {
  SHAPE_LABELS,
  type BlockTextures,
  type MaterialName,
  type ShapeName,
} from 'shared';
import { downscaleTile, tileToBase64 } from '../../maps';
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

const FACE_LABELS: Record<TextureFace, string> = {
  top: 'Верх',
  side: 'Бок',
  bottom: 'Низ',
};

interface TextureSetEditorProps {
  // Чьи текстуры правим: группы (куб) или отдельной формы — для подписей и предпросмотра.
  shape: ShapeName;
  // «Узор основы» у группы, «Как у блока» у формы: что значит «своих текстур нет».
  patternLabel: string;
  // Текущие текстуры; читаются заново после чтения картинки — за это время их могли
  // поменять.
  getTextures: () => BlockTextures | null;
  // С чего начинаются свои текстуры: у группы — узор основы, у формы — вид группы.
  startFrom: () => BlockTextures | null;
  look: MaterialName;
  color: string;
  // recolor — плитку заменили загрузкой или рисунком: основной цвет пора пересчитать.
  onChange: (textures: BlockTextures | null, recolor: boolean) => void;
}

// Набор текстур (docs/plan/blocks.md, этапы 4б, 5 и 5б): способ — без своих, одна на
// все грани или верх, бок и низ — и плитки, которые рисуют в пиксельном редакторе или
// загружают картинкой (сжимается до 16×16 в браузере).
function TextureSetEditor(props: TextureSetEditorProps) {
  const { shape, patternLabel, getTextures, look, color, onChange } = props;
  const textures = getTextures();
  const mode = textureModeOf(textures);
  // «Верх, бок, низ» с тремя одинаковыми плитками выглядит как «одна на все» — выбор
  // держим сами, пока пользователь не загрузил разные.
  const [chosen, setChosen] = useState<TextureMode>(mode);
  const shown = chosen === 'faces' && textures ? 'faces' : mode;
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState<TextureFace | null>(null);
  const [drawing, setDrawing] = useState<TileEditorTarget | null>(null);
  // На телефоне три способа в ряд не помещаются — «Верх, бок, низ» обрезался.
  const narrow = useMediaQuery('(max-width: 30em)');

  const applyTile = (face: TextureFace, tile: string) => {
    const current = getTextures();
    if (current) onChange(withUploadedTile(shown, current, face, tile), true);
  };

  // Переход к «одной на все» оставляет боковую плитку, к «без своих» — убирает свои
  // текстуры совсем; до сохранения формы это отменяется кнопкой «Отмена».
  const changeMode = (next: TextureMode) => {
    setChosen(next);
    setError(null);
    onChange(
      texturesForMode(next, getTextures() ?? props.startFrom(), look, color),
      false,
    );
  };

  // Пока картинка читается, кнопки загрузки и смена способа заблокированы: иначе две
  // быстрые загрузки затёрли бы друг друга.
  const upload = (face: TextureFace, file: File | null) => {
    if (!file || !getTextures()) return;
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

  const single = shown === 'single';
  const faces: TextureFace[] = single ? ['side'] : ['top', 'side', 'bottom'];

  return (
    <Stack gap="xs">
      <SegmentedControl
        data={[
          { value: 'pattern', label: patternLabel },
          { value: 'single', label: 'Одна на все грани' },
          { value: 'faces', label: 'Верх, бок, низ' },
        ]}
        value={shown}
        onChange={(value) => changeMode(value)}
        aria-label="Текстуры"
        disabled={reading !== null}
        orientation={narrow ? 'vertical' : 'horizontal'}
        fullWidth
        maw={460}
      />
      {textures && (
        <>
          <Group gap="md" align="flex-start">
            {faces.map((face) => {
              const faceName = FACE_LABELS[face].toLowerCase();
              const title = single
                ? 'Текстура всех граней'
                : `Текстура: ${faceName}`;
              // В окне редактора у формы — и её название: «Ступени — текстура: верх».
              const editorTitle =
                shape === 'cube'
                  ? title
                  : `${SHAPE_LABELS[shape]} — ${title.toLowerCase()}`;
              return (
                <TextureTileCard
                  key={face}
                  tile={textures[face]}
                  label={single ? 'Все грани' : FACE_LABELS[face]}
                  alt={title}
                  target={single ? 'текстуру' : `текстуру: ${faceName}`}
                  reading={reading === face}
                  disabled={reading !== null && reading !== face}
                  onUpload={(file) => upload(face, file)}
                  onDraw={() =>
                    setDrawing({ face, mode: shown, title: editorTitle })
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
        shape={shape}
        look={look}
        color={color}
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

export default TextureSetEditor;
