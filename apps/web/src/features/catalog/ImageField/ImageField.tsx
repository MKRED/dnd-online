import { Button, FileButton, Group, Loader, Stack, Text } from '@mantine/core';
import { Dropzone, type FileRejection } from '@mantine/dropzone';
import { useState } from 'react';
import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';
import type { ImagePathFn } from '../catalogApi';
import CatalogThumb, { CropPreview } from '../CatalogThumb';
import {
  effectiveCrop,
  readImageFile,
  sameCrop,
  type ImageDraft,
} from './imageDraft';
import classes from './ImageField.module.css';
import ThumbEditor from './ThumbEditor';

const MAX_MEGABYTES = IMAGE_MAX_BYTES / (1024 * 1024);
const ACCEPT = [...IMAGE_MIME_TYPES];

// Причина отказа на русском: коды приходят от react-dropzone, тексты у него английские.
function rejectionMessage([rejection]: FileRejection[]): string {
  const codes = rejection?.errors.map((error) => error.code) ?? [];
  if (codes.includes('file-too-large')) {
    return `Картинка больше ${MAX_MEGABYTES} МБ`;
  }
  return 'Не тот формат — подойдут JPEG, PNG и WebP';
}

interface ImageFieldProps {
  // null — запись ещё не создана, сохранённой картинки у неё нет.
  entryId: string | null;
  entryName: string;
  imagePath: ImagePathFn;
  draft: ImageDraft;
  onChange: (draft: ImageDraft) => void;
}

// Картинка записи каталога и её миниатюра. Изменения копятся в черновике и уходят на
// сервер вместе с формой (saveImage).
function ImageField({
  entryId,
  entryName,
  imagePath,
  draft,
  onChange,
}: ImageFieldProps) {
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const recropped =
    draft.kind === 'saved' && !sameCrop(draft.crop, draft.image.thumbCrop);
  // Полная картинка сохранённой записи нужна только редактору и предпросмотру
  // изменённого выреза: для обычного показа хватает миниатюры с сервера.
  const fullUrl = useImageUrl(
    draft.kind === 'saved' && entryId && (editing || recropped)
      ? imagePath(entryId, 'full', draft.image.version)
      : null,
  );
  const src = draft.kind === 'new' ? draft.url : fullUrl;

  const pickFile = (file: File | null) => {
    if (!file) return;
    setProblem(null);
    if (file.size > IMAGE_MAX_BYTES) {
      setProblem(`Картинка больше ${MAX_MEGABYTES} МБ`);
      return;
    }
    readImageFile(file)
      .then(({ url, width, height }) =>
        onChange({ kind: 'new', file, url, width, height, crop: null }),
      )
      .catch((err: unknown) => {
        console.error('Failed to read image file', err);
        setProblem('Не удалось прочитать картинку');
      });
  };

  if (draft.kind === 'none') {
    return (
      <Stack gap="xs" className={classes.imageColumn}>
        <Dropzone
          className={classes.dropzone}
          accept={ACCEPT}
          maxSize={IMAGE_MAX_BYTES}
          multiple={false}
          onDrop={([file]) => pickFile(file ?? null)}
          onReject={(rejections) => setProblem(rejectionMessage(rejections))}
          aria-label="Выбрать картинку"
        >
          <Text size="sm" fw={500}>
            Перетащите картинку сюда или нажмите
          </Text>
          <Text size="xs" c="dimmed" mt={4}>
            JPEG, PNG, WebP · до {MAX_MEGABYTES} МБ
          </Text>
        </Dropzone>
        {problem && (
          <Text size="sm" c="red">
            {problem}
          </Text>
        )}
      </Stack>
    );
  }

  const { width, height, crop } = effectiveCrop(draft);
  return (
    <Stack gap="xs" className={classes.imageColumn}>
      {draft.kind === 'saved' && !recropped && entryId ? (
        <CatalogThumb
          entry={{ id: entryId, name: entryName, image: draft.image }}
          imagePath={imagePath}
        />
      ) : src ? (
        <CropPreview src={src} width={width} height={height} crop={crop} />
      ) : (
        <Loader size="sm" />
      )}
      <Group gap="xs">
        <Button size="xs" variant="light" onClick={() => setEditing(true)}>
          Миниатюра
        </Button>
        <FileButton onChange={pickFile} accept={ACCEPT.join(',')}>
          {(props) => (
            <Button size="xs" variant="default" {...props}>
              Заменить
            </Button>
          )}
        </FileButton>
        <Button
          size="xs"
          variant="subtle"
          color="red"
          onClick={() => onChange({ kind: 'none' })}
        >
          Убрать
        </Button>
      </Group>
      {problem && (
        <Text size="sm" c="red">
          {problem}
        </Text>
      )}
      {editing && src && (
        <ThumbEditor
          src={src}
          width={width}
          height={height}
          crop={crop}
          onClose={() => setEditing(false)}
          onSave={(next) => {
            onChange({ ...draft, crop: next });
            setEditing(false);
          }}
        />
      )}
    </Stack>
  );
}

export default ImageField;
