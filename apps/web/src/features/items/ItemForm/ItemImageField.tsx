import { Button, FileButton, Group, Loader, Stack, Text } from '@mantine/core';
import { Dropzone, type FileRejection } from '@mantine/dropzone';
import { useState } from 'react';
import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES } from 'shared';
import { useImageUrl } from '../../../lib/useImageUrls';
import ItemThumb, { CropPreview } from '../ItemThumb';
import { itemImagePath } from '../itemsApi';
import {
  effectiveCrop,
  readImageFile,
  sameCrop,
  type ImageDraft,
} from './imageDraft';
import classes from './ItemForm.module.css';
import ItemThumbEditor from './ItemThumbEditor';

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

interface ItemImageFieldProps {
  // null — предмет ещё не создан, сохранённой картинки у него нет.
  itemId: string | null;
  itemName: string;
  draft: ImageDraft;
  onChange: (draft: ImageDraft) => void;
}

// Картинка предмета и её миниатюра. Изменения копятся в черновике и уходят на сервер
// вместе с формой.
function ItemImageField({
  itemId,
  itemName,
  draft,
  onChange,
}: ItemImageFieldProps) {
  const [problem, setProblem] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const recropped =
    draft.kind === 'saved' && !sameCrop(draft.crop, draft.image.thumbCrop);
  // Полная картинка сохранённого предмета нужна только редактору и предпросмотру
  // изменённого выреза: для обычного показа хватает миниатюры с сервера.
  const fullUrl = useImageUrl(
    draft.kind === 'saved' && itemId && (editing || recropped)
      ? itemImagePath(itemId, 'full', draft.image.version)
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
        console.error('Failed to read item image file', err);
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
      {draft.kind === 'saved' && !recropped && itemId ? (
        <ItemThumb item={{ id: itemId, name: itemName, image: draft.image }} />
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
        <ItemThumbEditor
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

export default ItemImageField;
